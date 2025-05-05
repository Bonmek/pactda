interface JwtPayload {
  iss: string
  sub: string
  aud: string
  nonce: string
  exp?: number
  iat?: number
  [key: string]: any
}
