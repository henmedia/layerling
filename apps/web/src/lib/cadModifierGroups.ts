export function hasOneToOneCadComponentMapping(sourceCount: number, componentOwners: number[]) {
  if (!Number.isInteger(sourceCount) || sourceCount < 2 || componentOwners.length !== sourceCount) {
    return false;
  }

  const owners = new Set<number>();
  for (const owner of componentOwners) {
    if (!Number.isInteger(owner) || owner < 0 || owner >= sourceCount || owners.has(owner)) {
      return false;
    }
    owners.add(owner);
  }
  return owners.size === sourceCount;
}

/**
 * A bundle with a hole in it, inside the treated group (#1164): its hole cuts what it is grouped with but never its own solids,
 * the opposite of a plain group's scope (#996). Its scope key is counted up from here, so the kernel can tell the two apart.
 */
export const BUNDLE_SCOPE_BASE = 1_000_000;

export function isBundleScopeKey(key: number) {
  return key >= BUNDLE_SCOPE_BASE;
}
