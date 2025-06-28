import PostalMime from 'postal-mime';
import { sha256 } from '../helpers/sha256';

type RequestFields = { userId: string; r2Key: string };

export async function ingestHandler(request: Request, env: Env): Promise<Response> {
    if (request.headers.get('X-Worker-Secret') !== env.WORKER_SECRET) return new Response('forbidden', { status: 403 });

    const { userId, r2Key } = await request.json<RequestFields>();

    // pull raw .eml
    const obj = await env.RAW_MAIL_BUCKET.get(r2Key);
    if (!obj) return new Response('Not found', { status: 404 });

    const email = await new PostalMime().parse(await obj.arrayBuffer());
    const html = email.html ?? email.text ?? '';
    const hash = await sha256(html);

    let art = await env.DB.prepare('SELECT id FROM articles WHERE content_hash = ?').bind(hash).first();

    if (!art) {
        // store cleaned HTML (or the raw .eml again) in ARTICLES bucket
        await env.ARTICLES.put(`${hash}.html`, html);

        art = await env.DB.prepare(
            `
      INSERT INTO articles (id, content_hash, r2_object_key, subject, sender)
      VALUES (?, ?, ?, ?, ?) RETURNING id
    `
        )
            .bind(crypto.randomUUID(), hash, `${hash}.html`, email.subject ?? null, email.from?.address ?? null)
            .first();
    }

    await env.DB.prepare(
        `
    INSERT INTO inbox (id, user_id, article_id, received_at)
    VALUES (?, ?, ?, datetime('now'))
  `
    )
        .bind(crypto.randomUUID(), userId, art?.id)
        .run();

    return new Response('ok');
}