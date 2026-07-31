export interface ItemTierDef {
  id: number;
  key: string;
  name: string;
  textureKey: string;
  scoreValue: number;
  color: number;
}

export const ITEM_TIERS: ItemTierDef[] = [
  { id: 0, key: 'herb', name: 'Herb', textureKey: 'herb', scoreValue: 10, color: 0x4caf50 },
  { id: 1, key: 'herbBundle', name: 'Herb Bundle', textureKey: 'herbBundle', scoreValue: 25, color: 0x66bb6a },
  { id: 2, key: 'flask', name: 'Flask', textureKey: 'flask', scoreValue: 50, color: 0x42a5f5 },
  { id: 3, key: 'potion', name: 'Potion', textureKey: 'potion', scoreValue: 100, color: 0xab47bc },
  { id: 4, key: 'rarePotion', name: 'Rare Potion', textureKey: 'rarePotion', scoreValue: 250, color: 0xff7043 },
  { id: 5, key: 'legendaryPotion', name: 'Legendary Potion', textureKey: 'legendaryPotion', scoreValue: 500, color: 0xffd54f },
];

export function getTierById(id: number): ItemTierDef {
  return ITEM_TIERS[id] ?? ITEM_TIERS[0];
}

export function getNextTierId(tierId: number): number | null {
  if (tierId >= ITEM_TIERS.length - 1) return null;
  return tierId + 1;
}

export function canMerge(tierA: number, tierB: number): boolean {
  return tierA === tierB && getNextTierId(tierA) !== null;
}
