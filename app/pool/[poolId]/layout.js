// app/pool/[poolId]/layout.js — points each pool page at its own manifest (FINGERPRINT_V271_PUSH),
// so "Add to Home Screen" from a pool opens that pool.
export async function generateMetadata({ params }) {
  const id = String(params?.poolId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return { manifest: `/api/manifest?pool=${id}` };
}

export default function PoolLayout({ children }) {
  return children;
}
