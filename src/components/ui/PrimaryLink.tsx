import { Link, type LinkProps } from 'react-router-dom'
import { ApertureMark } from '../ApertureMark'
import { ctaClasses, ctaIconClasses } from './cta'

type PrimaryLinkProps = LinkProps & {
  size?: 'sm' | 'md'
}

export function PrimaryLink({ children, className = '', size = 'md', ...rest }: PrimaryLinkProps) {
  return (
    <Link {...rest} className={`${ctaClasses(size)} ${className}`}>
      <ApertureMark interactive className={ctaIconClasses(size)} />
      {children}
    </Link>
  )
}
