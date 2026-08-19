import type { IncomingMessage, ServerResponse } from 'node:http';

export function rejectIfNotAllowedInnertube(req: IncomingMessage, res: ServerResponse): boolean;
