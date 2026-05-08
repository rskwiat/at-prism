import { BskyAgent, RichText } from '@atproto/api';
export async function loginWithAppPassword(creds) {
    const agent = new BskyAgent({ service: process.env.BLUESKY_SERVICE });
    await agent.login({ identifier: creds.identifier, password: creds.password });
    return agent;
}
export async function createAgent(accessToken, did, refreshToken, handle) {
    const agent = new BskyAgent({ service: process.env.BLUESKY_SERVICE });
    await agent.resumeSession({
        accessJwt: accessToken,
        refreshJwt: refreshToken,
        did,
        handle,
        active: true,
    });
    return agent;
}
export async function postImageToBluesky(agent, caption, imageBlob, imageAlt) {
    const rt = new RichText({ text: caption });
    await rt.detectFacets(agent);
    const uploaded = await agent.uploadBlob(imageBlob, { encoding: 'image/jpeg' });
    const blob = uploaded.data.blob;
    const post = await agent.post({
        text: rt.text,
        facets: rt.facets,
        embed: {
            $type: 'app.bsky.embed.images',
            images: [
                {
                    alt: imageAlt || '',
                    image: blob,
                },
            ],
        },
    });
    return post.uri;
}
export async function postToBluesky(agent, caption, imageUrl, imageAlt) {
    const rt = new RichText({ text: caption });
    await rt.detectFacets(agent);
    const post = await agent.post({
        text: rt.text,
        facets: rt.facets,
        embed: {
            $type: 'app.bsky.embed.external',
            external: {
                uri: imageUrl,
                title: 'Image',
                description: imageAlt || 'Shared via imgur-bluesky',
            },
        },
    });
    return post.uri;
}
