import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return <div className={cn('card', className)} {...props} />;
}

export function CardBody({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />;
}
