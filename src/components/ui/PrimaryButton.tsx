import type { ButtonHTMLAttributes } from 'react'
import { ApertureMark } from '../ApertureMark'
import { ctaClasses, ctaIconClasses } from './cta'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'sm' | 'md'
}

export function PrimaryButton({
  children,
  className = '',
  size = 'md',
  ...rest
}: PrimaryButtonProps) {
  return (
    <button {...rest} className={`${ctaClasses(size)} ${className}`}>
      <ApertureMark interactive className={ctaIconClasses(size)} />
      {children}
    </button>
  )
}
