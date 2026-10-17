/**
 * OpenAPI de /api/users.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── USERS ──────────────────────────────────────────────────────────────
 *   /api/users:
 *     get:
 *       summary: List users (paginated)
 *       tags: [Users]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: page
 *           schema: { type: integer, default: 1, minimum: 1 }
 *         - in: query
 *           name: limit
 *           schema: { type: integer, default: 10, minimum: 1, maximum: 100 }
 *       responses:
 *         '200':
 *           description: Paginated user list
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean }
 *                   data:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         username: { type: string }
 *                         email: { type: string }
 *                         role: { type: string }
 *                         createdAt: { type: string, format: date-time }
 *                   pagination:
 *                     type: object
 *                     properties:
 *                       page: { type: integer }
 *                       limit: { type: integer }
 *                       totalCount: { type: integer }
 *                       totalPages: { type: integer }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *     post:
 *       summary: Create a new user (admin or public signup)
 *       tags: [Users]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [username, email, password]
 *               properties:
 *                 username: { type: string, minLength: 3 }
 *                 email: { type: string, format: email }
 *                 password: { type: string, minLength: 6 }
 *                 name: { type: string }
 *                 role: { type: string, enum: [USER, ADMIN] }
 *       responses:
 *         '201': { description: User created successfully }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '409': { description: Username or email already exists }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *
 *   /api/users/me/preferences:
 *     patch:
 *       summary: Update the authenticated user's locale and currency preferences
 *       tags: [Users]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 locale: { type: string, enum: [en, pt] }
 *                 currency: { type: string, enum: [BRL, USD, EUR] }
 *       responses:
 *         '200': { description: Preferences updated }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/users/{id}:
 *     get:
 *       summary: Get a user by ID
 *       tags: [Users]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - name: id
 *           in: path
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: User object }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     put:
 *       summary: Update a user by ID (admin)
 *       tags: [Users]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - name: id
 *           in: path
 *           required: true
 *           schema: { type: string, format: cuid }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name: { type: string }
 *                 username: { type: string, minLength: 3 }
 *                 email: { type: string, format: email }
 *                 password: { type: string, minLength: 6 }
 *                 role: { type: string, enum: [USER, ADMIN] }
 *       responses:
 *         '200': { description: Updated user }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Delete a user by ID (admin)
 *       tags: [Users]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - name: id
 *           in: path
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: User deleted successfully }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
