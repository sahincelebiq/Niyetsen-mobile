/**
 * faz8.13/6 — Zincir 12 hayvanlı evrim (burçlara benzer sabit set).
 *
 * Kural: her hayvan 30 günlük bir dönemi temsil eder (12 × 30 ≈ 365 günlük
 * vizyon). Dönem içinde 3 yaşam aşaması görünür:
 *   0-9. gün  → Bebek   (küçük ikon)
 *   10-19. gün → Genç   (orta ikon)
 *   20-29. gün → Yetişkin (büyük ikon)
 * Zincir kırılınca kullanıcı 1. hayvanın bebekliğine döner — ton kuralı:
 * kayıp hissi + kimlik ✅ ("Serçen seni bekliyor"), utandırma ❌.
 *
 * İkonlar MaterialCommunityIcons (gerçek vektör ikon — emoji DEĞİL);
 * app-tabs ile aynı aile, tutarlı stil.
 */
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

export type ChainIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type ChainStage = 'bebek' | 'genc' | 'yetiskin';

export type ChainAnimal = {
  /** Sıra (0-11) — 30 günlük dönem indeksi. */
  index: number;
  name: string;
  icon: ChainIconName;
  /** Hayvanın kişilik cümlesi — rank ekranında görünür. */
  motto: string;
};

export const CHAIN_CYCLE_DAYS = 30;

export const CHAIN_ANIMALS: ChainAnimal[] = [
  { index: 0, name: 'Serçe', icon: 'bird', motto: 'İlk adımların en cesuru — küçük ama kararlı.' },
  { index: 1, name: 'Tavşan', icon: 'rabbit', motto: 'Hız kazanıyorsun; ritim artık senin.' },
  { index: 2, name: 'Kaplumbağa', icon: 'tortoise', motto: 'Yavaş ve emin — istikrar karakterin oldu.' },
  { index: 3, name: 'Kedi', icon: 'cat', motto: 'Dengeyi buldun; her düşüşte ayaklarının üstüne.' },
  { index: 4, name: 'Baykuş', icon: 'owl', motto: 'Artık bilgece seçiyorsun — neye evet, neye hayır.' },
  { index: 5, name: 'Yunus', icon: 'dolphin', motto: 'Akışla oynuyorsun; disiplin sana neşe veriyor.' },
  { index: 6, name: 'Panda', icon: 'panda', motto: 'Sükûnetin gücü — yarım yıl sabır demek.' },
  { index: 7, name: 'At', icon: 'horse', motto: 'Dörtnala — hedefin ufukta net görünüyor.' },
  { index: 8, name: 'Kanguru', icon: 'kangaroo', motto: 'Sıçramalar dönemi; her hafta yeni bir zirve.' },
  { index: 9, name: 'Fil', icon: 'elephant', motto: 'Unutmayan hafıza, sarsılmayan adımlar.' },
  { index: 10, name: 'Penguen', icon: 'penguin', motto: 'Fırtınada bile sıranı bozmuyorsun.' },
  { index: 11, name: 'Tek Boynuz', icon: 'unicorn', motto: 'Efsane aşaması — 365 günlük vizyonun kendisi.' },
];

export const STAGE_LABELS: Record<ChainStage, string> = {
  bebek: 'Bebek',
  genc: 'Genç',
  yetiskin: 'Yetişkin',
};

export type ChainEvolution = {
  animal: ChainAnimal;
  stage: ChainStage;
  /** Dönem içi gün (0-29). */
  dayInCycle: number;
  /** Bir sonraki aşamaya/hayvana kalan gün. */
  daysToNext: number;
  /** Sonraki adım etiketi ("Genç Serçe" ya da "Bebek Tavşan"). */
  nextLabel: string;
  /** Dönem içi ilerleme 0-1 (aşama çubuğu için). */
  cycleProgress: number;
};

export function chainEvolution(
  streakDays: number,
  chosenAnimalIndex?: number | null,
): ChainEvolution {
  const safeDays = Math.max(0, streakDays);
  const cycle = Math.min(Math.floor(safeDays / CHAIN_CYCLE_DAYS), CHAIN_ANIMALS.length - 1);
  const autoAnimal = CHAIN_ANIMALS[cycle];
  const picked =
    chosenAnimalIndex != null && chosenAnimalIndex >= 0 && chosenAnimalIndex < CHAIN_ANIMALS.length
      ? CHAIN_ANIMALS[chosenAnimalIndex]
      : null;
  const animal = picked ?? autoAnimal;
  const lastCycle = cycle === CHAIN_ANIMALS.length - 1;
  // Son hayvanda (Tek Boynuz) gün sayacı dönmeye devam eder ama hayvan sabit.
  const dayInCycle = lastCycle
    ? Math.min(safeDays - cycle * CHAIN_CYCLE_DAYS, CHAIN_CYCLE_DAYS - 1)
    : safeDays % CHAIN_CYCLE_DAYS;

  let stage: ChainStage;
  let daysToNext: number;
  let nextLabel: string;
  if (dayInCycle < 10) {
    stage = 'bebek';
    daysToNext = 10 - dayInCycle;
    nextLabel = `Genç ${animal.name}`;
  } else if (dayInCycle < 20) {
    stage = 'genc';
    daysToNext = 20 - dayInCycle;
    nextLabel = `Yetişkin ${animal.name}`;
  } else {
    stage = 'yetiskin';
    daysToNext = CHAIN_CYCLE_DAYS - dayInCycle;
    const nextIndex = Math.min(animal.index + 1, CHAIN_ANIMALS.length - 1);
    const next = CHAIN_ANIMALS[nextIndex];
    const atLast = animal.index === CHAIN_ANIMALS.length - 1;
    nextLabel = atLast ? `Efsane ${animal.name}` : `Bebek ${next.name}`;
  }

  return {
    animal,
    stage,
    dayInCycle,
    daysToNext,
    nextLabel,
    cycleProgress: Math.min(dayInCycle / (CHAIN_CYCLE_DAYS - 1), 1),
  };
}

/** Aşamaya göre ikon boyutu — büyüme GÖRÜNÜR olsun (bebek küçük, yetişkin büyük). */
export function stageIconSize(stage: ChainStage, base = 30): number {
  if (stage === 'bebek') return Math.round(base * 0.72);
  if (stage === 'genc') return Math.round(base * 0.88);
  return base;
}
