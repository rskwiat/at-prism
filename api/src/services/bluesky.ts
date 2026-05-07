import { BskyAgent, RichText } from '@atproto/api';

export interface BlueskyCredentials {
  identifier: string;
  password: string;
}

export async function loginWithAppPassword(creds: BlueskyCredentials) {
  const agent = new BskyAgent({ service: process.env.BLUESKY_SERVICE! });
  await agent.login({ identifier: creds.identifier, password: creds.password });
  return agent;
}

export async function postToBluesky(
  agent: BskyAgent,
  caption: string,
  imageUrl: string,
  imageAlt?: string
) {
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