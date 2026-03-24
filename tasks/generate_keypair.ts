import { generateKeyPairSync } from 'crypto';
import fs from 'fs';

const curve = 'prime256v1';
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: curve });
const publicJWK = publicKey.export({ format: 'jwk' });
const privateJWK = privateKey.export({ format: 'jwk' });

fs.writeFileSync('public.jwk', JSON.stringify(publicJWK, null, 2));
fs.writeFileSync('private.jwk', JSON.stringify(privateJWK, null, 2));

console.log('> Successfully generated JWK keypair');
