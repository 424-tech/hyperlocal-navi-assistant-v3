
import React from 'react';
import { GroundingChunk } from '../types';
import { SourceIcon } from './Icons';

interface GroundingSourcesProps {
  chunks: GroundingChunk[];
}

const GroundingSources: React.FC<GroundingSourcesProps> = ({ chunks }) => {
  if (!chunks || chunks.length === 0) return null;

  const validChunks = chunks.filter(chunk => chunk.web?.uri || chunk.maps?.uri);

  if (validChunks.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <h4 className="font-semibold text-slate-500 flex items-center gap-1.5 text-xs uppercase tracking-wide mb-2">
        <SourceIcon /> Verified Sources:
      </h4>
      <div className="flex flex-wrap gap-2">
        {validChunks.map((chunk, index) => {
          const source = chunk.web || chunk.maps;
          const isMap = !!chunk.maps;
          if (!source) return null;
          
          return (
            <a 
                key={index} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`text-xs border px-2 py-1 rounded-md transition-colors flex items-center gap-1 truncate max-w-[200px] ${
                    isMap 
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
            >
                {isMap ? '📍' : '🔗'} {source.title || 'View Source'}
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default GroundingSources;
