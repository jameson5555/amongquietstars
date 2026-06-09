export type Song = {
  title: string;
  src: string;
};

const songAsset = (filename: string) => `${import.meta.env.BASE_URL}songs/${filename}`;

export const songs: Song[] = [
  { title: 'Velvet Nebula Drift', src: songAsset('Velvet Nebula Drift.mp3') },
  { title: 'Galactic Drift', src: songAsset('Galactic Drift.mp3') },
  { title: 'Quiet Star Drift', src: songAsset('Quiet Star Drift.mp3') },
  { title: 'Cosmic Keyhole', src: songAsset('Cosmic Keyhole.mp3') },
  { title: 'Velvet Nebula Chillout', src: songAsset('Velvet Nebula Chillout.mp3') }
];
