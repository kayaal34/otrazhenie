export function ctaClasses(size: 'sm' | 'md' = 'md'): string {
  const sizeClasses = size === 'sm' ? 'px-4 py-2 text-sm' : 'px-8 py-3 text-base'
  return `group inline-flex items-center justify-center gap-2 rounded-full bg-blue-primary font-body font-medium text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${sizeClasses}`
}

export function ctaIconClasses(size: 'sm' | 'md' = 'md'): string {
  return size === 'sm' ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'
}
