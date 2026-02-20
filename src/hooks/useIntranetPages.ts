import { useState, useCallback, useEffect, useRef } from 'react';
import { useCloudStorage } from '@/hooks/useCloudStorage';

export interface IntranetPage {
  slug: string;
  title: string;
  content: string;
  author: string;
  category: 'page' | 'blog';
  coverImage?: string;
  publishedAt: string;
  updatedAt: string;
}

export function useIntranetPages() {
  const { save, load } = useCloudStorage();
  const [pages, setPages] = useState<IntranetPage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load<IntranetPage[]>('intranet-pages').then(p => {
      if (p && p.length) setPages(p);
      setLoaded(true);
    });
  }, [load]);

  const persist = useCallback((next: IntranetPage[]) => {
    setPages(next);
    save('intranet-pages', next);
  }, [save]);

  const publishPage = useCallback((page: Omit<IntranetPage, 'updatedAt'> & { updatedAt?: string }) => {
    const now = new Date().toISOString();
    const full: IntranetPage = { ...page, updatedAt: page.updatedAt || now };
    setPages(prev => {
      const idx = prev.findIndex(p => p.slug === full.slug);
      const next = idx >= 0 ? prev.map((p, i) => i === idx ? full : p) : [...prev, full];
      save('intranet-pages', next);
      return next;
    });
  }, [save]);

  const deletePage = useCallback((slug: string) => {
    setPages(prev => {
      const next = prev.filter(p => p.slug !== slug);
      save('intranet-pages', next);
      return next;
    });
  }, [save]);

  const getPage = useCallback((slug: string) => pages.find(p => p.slug === slug), [pages]);

  return { pages, loaded, publishPage, deletePage, getPage };
}
