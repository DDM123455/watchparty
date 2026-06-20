import type { SeoPageConfig } from './SeoPickerPage';

const ALL_RELATED = [
  { label: 'Horror',  href: '/random-horror-movie-generator' },
  { label: 'Comedy',  href: '/random-comedy-movie-generator' },
  { label: 'Action',  href: '/random-action-movie-generator' },
  { label: 'Anime',   href: '/random-anime-generator' },
  { label: 'Netflix', href: '/random-netflix-movie-generator' },
  { label: 'TV Show', href: '/random-tv-show-generator' },
  { label: 'Family',  href: '/random-family-movie-generator' },
  { label: 'Random',  href: '/random-movie-generator' },
];

function related(exclude: string): { label: string; href: string }[] {
  return ALL_RELATED.filter(r => !r.href.includes(exclude));
}

export const SEO_CONFIGS: Record<string, SeoPageConfig> = {
  horror: {
    slug: 'horror',
    title: 'Random Horror Movie Generator — Find Your Next Scare',
    metaDesc: 'Discover your next scary movie with our random horror film generator. Filter by decade and streaming platform. Prepare to be terrified.',
    h1: 'Random Horror Movie Generator',
    description: "Can't pick a horror movie? Let our random generator find the perfect scare for you. We pull from thousands of horror films — from classic slashers to modern psychological thrillers. Hit Generate and get watching.",
    relatedPages: related('horror'),
  },
  comedy: {
    slug: 'comedy',
    title: 'Random Comedy Movie Generator — Pick a Funny Movie Now',
    metaDesc: 'Find your next laugh with our random comedy movie picker. Choose from classic, romantic, or dark comedies on your streaming service.',
    h1: 'Random Comedy Movie Generator',
    description: "Not sure what comedy to watch? Our random picker pulls from thousands of funny films. Whether you want slapstick, romantic comedy, or dark humour — just hit Generate and start laughing.",
    relatedPages: related('comedy'),
  },
  action: {
    slug: 'action',
    title: 'Random Action Movie Generator — Your Next Adrenaline Fix',
    metaDesc: "Can't choose an action movie? Our random generator picks from thousands of action films across all major streaming platforms.",
    h1: 'Random Action Movie Generator',
    description: "Need an adrenaline rush but can't decide what to watch? Our random action movie generator picks from blockbusters, martial arts films, spy thrillers, and everything in between.",
    relatedPages: related('action'),
  },
  anime: {
    slug: 'anime',
    title: 'Random Anime Generator — Discover Your Next Series',
    metaDesc: 'Pick a random anime movie or series with our anime generator. Filter by genre and streaming service. Perfect for beginners and veterans alike.',
    h1: 'Random Anime Generator',
    description: "Whether you're new to anime or a seasoned fan looking for something fresh, our random anime generator pulls from the best Japanese animation — from Studio Ghibli classics to modern isekai adventures.",
    relatedPages: related('anime'),
  },
  netflix: {
    slug: 'netflix',
    title: 'Random Netflix Movie — What to Watch on Netflix Tonight',
    metaDesc: 'Use our random Netflix movie generator to discover hidden gems and popular picks available on Netflix right now.',
    h1: 'Random Netflix Movie Generator',
    description: "Scrolling Netflix for 20 minutes and still haven't picked anything? Hit Generate and we'll instantly pull a movie available on Netflix. No more decision paralysis.",
    relatedPages: related('netflix'),
  },
  tv: {
    slug: 'tv',
    preset: 'tv',
    title: 'Random TV Show Generator — Pick a Binge-Worthy Series',
    metaDesc: 'Find your next TV obsession with our random show picker. Filter by genre and streaming platform.',
    h1: 'Random TV Show Generator',
    description: "Can't pick a TV show to binge? Our random TV show generator pulls from thousands of series across every genre. One click and you'll have your next obsession.",
    relatedPages: related('tv'),
  },
  family: {
    slug: 'family',
    title: 'Random Family Movie Generator — Fun for Everyone',
    metaDesc: 'Discover family-friendly movies the whole household will enjoy. Filtered to G/PG ratings across all streaming services.',
    h1: 'Random Family Movie Generator',
    description: "Finding a movie the whole family agrees on is hard. Our family movie generator filters to kid-safe G and PG-rated films that adults will enjoy too. Great for movie nights with children.",
    relatedPages: related('family'),
  },
  random: {
    slug: 'random',
    title: 'Random Movie Generator — Pick a Movie to Watch Tonight',
    metaDesc: "Can't decide what movie to watch? Our random movie picker finds the perfect film instantly. Filter by genre, year, and streaming service.",
    h1: 'Random Movie Generator',
    description: "Our random movie generator picks from thousands of films across every genre and decade. Can't decide what to watch? One click is all it takes to find your next great movie.",
    relatedPages: related('random-movie'),
  },
};
