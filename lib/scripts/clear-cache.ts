import { getRedis, CACHE_KEYS } from '../redis';

async function main() {
  const redis = getRedis();
  await redis.del(CACHE_KEYS.toolsAll);
  await redis.del('bundles:all');
  console.log('Cache cleared: tools:all and bundles:all');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
