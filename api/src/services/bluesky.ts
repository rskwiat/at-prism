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

export async function createAgent(accessToken: string, did: string, refreshToken: string, handle: string) {
  const agent = new BskyAgent({ service: process.env.BLUESKY_SERVICE! });
  await agent.resumeSession({
    accessJwt: accessToken,
    refreshJwt: refreshToken,
    did,
    handle,
    active: true,
  });
  return agent;
}

export async function postImageToBluesky(
  agent: BskyAgent,
  caption: string,
  imageBlob: Buffer,
  imageAlt?: string
) {
  const rt = new RichText({ text: caption });
  await rt.detectFacets(agent);

  const uploaded: any = await agent.uploadBlob(imageBlob, { encoding: 'image/jpeg' });
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
  } as any);

  return post.uri;
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