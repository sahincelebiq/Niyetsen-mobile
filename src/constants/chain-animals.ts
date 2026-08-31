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
  genc: 'Olgun',
  yetiskin: 'Erişkin',
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
    nextLabel = `Olgun ${animal.name}`;
  } else if (dayInCycle < 20) {
    stage = 'genc';
    daysToNext = 20 - dayInCycle;
    nextLabel = `Erişkin ${animal.name}`;
  } else {
    stage = 'yetiskin';
    daysToNext = CHAIN_CYCLE_DAYS - dayInCycle;
    const year = Math.max(1, Math.floor(safeDays / CHAIN_CYCLE_DAYS));
    const atLast = animal.index === CHAIN_ANIMALS.length - 1;
    nextLabel = atLast ? `Yaş ${year} ${animal.name}` : `Bebek ${CHAIN_ANIMALS[Math.min(animal.index + 1, CHAIN_ANIMALS.length - 1)].name}`;
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

/** Kullanıcının seçtiği yoldaş — filiz veya 12 hayvandan biri. */
export const SPROUT_ID = 'sprout' as const;
export type CompanionId = typeof SPROUT_ID | number;

export type CompanionGrowth = {
  key: 'bebek' | 'olgun' | 'eriskin' | 'yas';
  label: string;
  year: number;
  nextLabel: string;
};

export type CompanionLabels = {
  filiz: string;
  sproutMotto: string;
  stageBaby: string;
  stageMature: string;
  stageAdult: string;
  age: (n: number) => string;
  animalNames: readonly string[];
  animalMottos: readonly string[];
};

const DEFAULT_LABELS: CompanionLabels = {
  filiz: 'Filiz',
  sproutMotto: 'Küçük bir filiz; her gün bir yaprak daha.',
  stageBaby: 'Bebek',
  stageMature: 'Olgun',
  stageAdult: 'Erişkin',
  age: (n) => `Yaş ${n}`,
  animalNames: CHAIN_ANIMALS.map((item) => item.name),
  animalMottos: CHAIN_ANIMALS.map((item) => item.motto),
};

export function companionLabelsFromMessages(copy: {
  filiz: string;
  sproutMotto: string;
  stageBaby: string;
  stageMature: string;
  stageAdult: string;
  age: (n: number) => string;
  animalNames: readonly string[];
  animalMottos: readonly string[];
}): CompanionLabels {
  return {
    filiz: copy.filiz,
    sproutMotto: copy.sproutMotto,
    stageBaby: copy.stageBaby,
    stageMature: copy.stageMature,
    stageAdult: copy.stageAdult,
    age: copy.age,
    animalNames: copy.animalNames,
    animalMottos: copy.animalMottos,
  };
}

/** Seçili yoldaşın kendi günleri — zincir kırılsa bile olgunluk silinmez. */
export function companionGrowth(
  investedDays: number,
  labels: CompanionLabels = DEFAULT_LABELS,
): CompanionGrowth {
  const days = Math.max(0, Math.floor(investedDays));
  if (days < 10) {
    return { key: 'bebek', label: labels.stageBaby, year: 0, nextLabel: labels.stageMature };
  }
  if (days < 20) {
    return { key: 'olgun', label: labels.stageMature, year: 0, nextLabel: labels.stageAdult };
  }
  if (days < 30) {
    return { key: 'eriskin', label: labels.stageAdult, year: 0, nextLabel: labels.age(1) };
  }
  const year = Math.max(1, Math.floor(days / 30));
  return {
    key: 'yas',
    label: labels.age(year),
    year,
    nextLabel: labels.age(year + 1),
  };
}

export function sproutIcon(key: CompanionGrowth['key']): ChainIconName {
  if (key === 'bebek') return 'sprout';
  if (key === 'olgun') return 'leaf';
  return 'pine-tree';
}

export function growthIconSize(key: CompanionGrowth['key'], base = 30): number {
  if (key === 'bebek') return Math.round(base * 0.7);
  if (key === 'olgun') return Math.round(base * 0.86);
  if (key === 'eriskin') return base;
  return Math.round(base * 1.08);
}

export function companionStorageKey(id: CompanionId): string {
  return id === SPROUT_ID ? SPROUT_ID : String(id);
}

export type CompanionVisual = {
  id: CompanionId | null;
  icon: ChainIconName;
  name: string;
  motto: string;
  stageLabel: string;
  nextLabel: string;
  iconSize: number;
};

export function companionVisual(
  id: CompanionId | null,
  investedDays: number,
  streakDays: number,
  baseIcon = 30,
  labels: CompanionLabels = DEFAULT_LABELS,
): CompanionVisual {
  const nameOf = (index: number, fallback: string) => labels.animalNames[index] ?? fallback;
  const mottoOf = (index: number, fallback: string) => labels.animalMottos[index] ?? fallback;

  if (id === SPROUT_ID) {
    const growth = companionGrowth(investedDays, labels);
    return {
      id,
      icon: sproutIcon(growth.key),
      name: labels.filiz,
      motto: labels.sproutMotto,
      stageLabel: growth.label,
      nextLabel: growth.nextLabel,
      iconSize: growthIconSize(growth.key, baseIcon),
    };
  }
  if (typeof id === 'number' && id >= 0 && id < CHAIN_ANIMALS.length) {
    const animal = CHAIN_ANIMALS[id];
    const growth = companionGrowth(investedDays, labels);
    return {
      id,
      icon: animal.icon,
      name: nameOf(id, animal.name),
      motto: mottoOf(id, animal.motto),
      stageLabel: growth.label,
      nextLabel: growth.nextLabel,
      iconSize: growthIconSize(growth.key, baseIcon),
    };
  }
  const evolution = chainEvolution(streakDays);
  const animal = evolution.animal;
  const localizedName = nameOf(animal.index, animal.name);
  const stageLabel =
    evolution.stage === 'bebek'
      ? labels.stageBaby
      : evolution.stage === 'genc'
        ? labels.stageMature
        : labels.stageAdult;
  let nextLabel = evolution.nextLabel;
  if (evolution.stage === 'bebek') {
    nextLabel = `${labels.stageMature} ${localizedName}`;
  } else if (evolution.stage === 'genc') {
    nextLabel = `${labels.stageAdult} ${localizedName}`;
  } else {
    const year = Math.max(1, Math.floor(Math.max(0, streakDays) / CHAIN_CYCLE_DAYS));
    const atLast = animal.index === CHAIN_ANIMALS.length - 1;
    const nextAnimal = CHAIN_ANIMALS[Math.min(animal.index + 1, CHAIN_ANIMALS.length - 1)];
    nextLabel = atLast
      ? `${labels.age(year)} ${localizedName}`
      : `${labels.stageBaby} ${nameOf(nextAnimal.index, nextAnimal.name)}`;
  }
  return {
    id: null,
    icon: animal.icon,
    name: localizedName,
    motto: mottoOf(animal.index, animal.motto),
    stageLabel,
    nextLabel,
    iconSize: stageIconSize(evolution.stage, baseIcon),
  };
}
