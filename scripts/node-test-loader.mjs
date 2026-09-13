/**
 * node:test için modül çözümleyici kaydı.
 *
 * `node --experimental-strip-types` tek başına `@/lib/x` alias'ını ve
 * uzantısız `../constants/scoring` import'unu çözemez (ESM tam uzantı ister).
 * Bu yükleyici ikisini de src/ altına eşler; böylece saf modüller Metro ile
 * aynı import biçimini kullanır ve testte de çalışır.
 *
 * Kullanım: node --experimental-strip-types --import ./scripts/node-test-loader.mjs --test <dosyalar>
 */
import { register } from 'node:module';

register('./node-test-resolver.mjs', import.meta.url);
