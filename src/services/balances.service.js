import { getAddress } from 'viem';
import { getTuxaPublicClient, ERC20_ABI } from './viemClient.js';

const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11';
const FALLBACK_CONCURRENCY = 3;
let multicallProbe = null;

function hasMulticall3(client) {
  if (!multicallProbe) {
    multicallProbe = client.getCode({ address: MULTICALL3 })
      .then((code) => Boolean(code && code !== '0x'))
      .catch(() => { multicallProbe = null; return false; });
  }
  return multicallProbe;
}

const ok = (value) => ({ status: 'ok', value, error: null });
const fail = (err) => {
  const zeroData = typeof err?.walk === 'function' && err.walk((e) => e?.name === 'ContractFunctionZeroDataError');
  return zeroData
    ? { status: 'no-contract', value: null, error: 'No hay contrato en esta dirección' }
    : { status: 'error', value: null, error: err?.shortMessage || err?.message || 'Error de RPC' };
};

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function fetchBalances(address, tokens) {
  const client = getTuxaPublicClient();
  const owner = getAddress(address);

  const nativeP = client.getBalance({ address: owner }).then(ok, fail);

  const tokensP = (async () => {
    const out = {};
    if (!tokens.length) return out;

    if (await hasMulticall3(client)) {
      try {
        const res = await client.multicall({
          allowFailure: true,
          multicallAddress: MULTICALL3,
          contracts: tokens.map((t) => ({ address: t.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [owner] })),
        });
        tokens.forEach((t, i) => {
          out[t.address.toLowerCase()] = res[i].status === 'success' ? ok(res[i].result) : fail(res[i].error);
        });
        return out;
      } catch { /* cae al fallback */ }
    }

    const items = await mapLimit(tokens, FALLBACK_CONCURRENCY, (t) =>
      client.readContract({ address: t.address, abi: ERC20_ABI, functionName: 'balanceOf', args: [owner] }).then(ok, fail)
    );
    tokens.forEach((t, i) => { out[t.address.toLowerCase()] = items[i]; });
    return out;
  })();

  const [native, tokensRes] = await Promise.all([nativeP, tokensP]);
  return { native, tokens: tokensRes, fetchedAt: Date.now() };
    }
