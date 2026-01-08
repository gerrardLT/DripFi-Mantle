import { privateKeyToAccount } from 'viem/accounts';
import { writeFileSync } from 'fs';
const pk = '0xd5ae8b1ee8bf796bbafccde6ce3dbb6151846acbd04398a43e400e966b289230';
const account = privateKeyToAccount(pk);
writeFileSync('address.txt', account.address);
