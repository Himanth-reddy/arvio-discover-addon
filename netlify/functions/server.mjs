import { createAddonHandler } from '../../server.mjs';

const handler = createAddonHandler();

export default async (req, context) => {
  return handler(req);
};

export const config = {
  path: '/*',
  preferStatic: true,
};
