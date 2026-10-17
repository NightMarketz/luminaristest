/**
 * OpenAPI de /api/auth.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *
 *   # ─── AUTH ──────────────────────────────────────────────────────────────
 *
 *   /api/auth/register:
 *     post:
 *       summary: Register a new user account
 *       tags: [Auth]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [username, email, password]
 *               properties:
 *                 username:
 *                   type: string
 *                   minLength: 3
 *                 email:
 *                   type: string
 *                   format: email
 *                 password:
 *                   type: string
 *                   minLength: 8
 *                 name:
 *                   type: string
 *                   description: Display name (optional)
 *       responses:
 *         '201':
 *           description: User created – returns JWT token and user profile
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           username: { type: string }
 *                           email: { type: string }
 *                           name: { type: string }
 *                           role: { type: string, enum: [USER, ADMIN] }
 *                           createdAt: { type: string, format: date-time }
 *                       token: { type: string, description: Bearer JWT }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *
 *   /api/auth/login:
 *     post:
 *       summary: Authenticate user and obtain a JWT token
 *       tags: [Auth]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [identifier, password]
 *               properties:
 *                 identifier:
 *                   type: string
 *                   description: Username or email address
 *                 password:
 *                   type: string
 *       responses:
 *         '200':
 *           description: Login successful – returns JWT token and user profile
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       user:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           username: { type: string }
 *                           email: { type: string }
 *                           name: { type: string }
 *                           role: { type: string, enum: [USER, ADMIN] }
 *                       token: { type: string, description: Bearer JWT }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '429': { description: Too many login attempts }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *
 *   /api/auth/me:
 *     get:
 *       summary: Get the currently authenticated user profile
 *       tags: [Auth]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200':
 *           description: Current user profile
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *
 *   /api/auth/logout:
 *     post:
 *       summary: Logout and invalidate the current session
 *       tags: [Auth]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '204': { description: Logout successful – no content }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
