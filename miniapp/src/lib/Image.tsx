import React from 'react';

export default function Image({ src, alt, width, height, className, priority, fill, ...props }: any) {
  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
  );
}
