import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, Video, Image, Download, X } from 'lucide-react';

interface MediaItem {
  id: string;
  media_type: string;
  url: string;
  prompt: string;
  created_at: string;
}

interface Props {
  onClose: () => void;
  onAnimateImage?: (imageUrl: string) => void;
}

export default function MediaGallery({ onClose, onAnimateImage }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('generated_media')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setItems((data as MediaItem[]) || []);
    setLoading(false);
  };

  const deleteItem = async (id: string) => {
    await supabase.from('generated_media').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.media_type === filter);

  return (
    <div className="flex flex-col h-full bg-[#02040a]">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[#00e5ff]/20">
        <h3 className="text-xs font-mono text-[#00e5ff] tracking-wider uppercase">Media Gallery</h3>
        <div className="flex items-center gap-1">
          {(['all', 'image', 'video'] as const).map(f => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              className={`h-6 text-[10px] px-2 ${filter === f ? 'text-[#00e5ff] bg-[#00e5ff]/15' : 'text-[#00e5ff]/40 hover:text-[#00e5ff]/70'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'image' ? <><Image size={10} className="mr-1" />Images</> : <><Video size={10} className="mr-1" />Videos</>}
            </Button>
          ))}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-[#00e5ff]/40 hover:text-[#00e5ff]" onClick={onClose}>
            <X size={12} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-[#00e5ff]/40 text-xs">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[#00e5ff]/30 text-xs">
            <Image size={24} className="mb-2 opacity-40" />
            <p>No generated media yet</p>
            <p className="text-[10px] mt-1">Use Image or Video mode to create media</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
            {filtered.map(item => (
              <div key={item.id} className="group relative rounded border border-[#00e5ff]/15 overflow-hidden bg-[#0a1929]/50 hover:border-[#00e5ff]/40 transition-colors">
                {item.media_type === 'image' ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <img src={item.url} alt={item.prompt} className="w-full h-24 object-cover" loading="lazy" />
                  </a>
                ) : (
                  <video src={item.url} className="w-full h-24 object-cover" preload="metadata" controls />
                )}
                <div className="p-1.5">
                  <p className="text-[9px] text-[#00e5ff]/60 font-mono truncate">{item.prompt || 'No prompt'}</p>
                  <p className="text-[8px] text-[#00e5ff]/30 mt-0.5">{new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                {/* Hover actions */}
                <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                  {item.media_type === 'image' && onAnimateImage && (
                    <Button size="icon" variant="ghost" className="h-5 w-5 bg-[#02040a]/80 text-[#00e5ff]/70 hover:text-[#00e5ff]" onClick={() => onAnimateImage(item.url)}>
                      <Video size={10} />
                    </Button>
                  )}
                  <a href={item.url} download target="_blank" rel="noopener noreferrer">
                    <Button size="icon" variant="ghost" className="h-5 w-5 bg-[#02040a]/80 text-[#00e5ff]/70 hover:text-[#00e5ff]">
                      <Download size={10} />
                    </Button>
                  </a>
                  <Button size="icon" variant="ghost" className="h-5 w-5 bg-[#02040a]/80 text-red-400/70 hover:text-red-400" onClick={() => deleteItem(item.id)}>
                    <Trash2 size={10} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
