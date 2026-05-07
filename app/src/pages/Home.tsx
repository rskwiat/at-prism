import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import ImageGrid from '../components/ImageGrid';
import { api } from '../api/client';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function Home() {
  const [search, setSearch] = useSearchParams();
  const sort = search.get('sort') || 'recent';
  const { checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['uploads', sort],
    queryFn: ({ pageParam }) => api.getUploads({ sort, limit: 20, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.cursor,
  });

  const allItems = data?.pages.flatMap(p => p.items) || [];

  return (
    <div className="home-page">
      <div className="sort-bar">
        <span>Sort:</span>
        <button className={sort === 'recent' ? 'active' : ''} onClick={() => setSearch({ sort: 'recent' })}>Recent</button>
        <button className={sort === 'trending' ? 'active' : ''} onClick={() => setSearch({ sort: 'trending' })}>Trending</button>
      </div>
      <ImageGrid uploads={allItems} />
      {hasNextPage && <button onClick={() => fetchNextPage()}>Load More</button>}
    </div>
  );
}