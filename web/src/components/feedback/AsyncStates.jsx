import React from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

export function LoadingState({
  title = 'Carregando...',
  description = 'Aguarde alguns instantes.',
  className,
}) {
  return (
    <div className={cn('flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8', className)}>
      <div className='text-center'>
        <Loader2 className='mx-auto mb-3 h-8 w-8 animate-spin text-blue-600' />
        <h3 className='text-lg font-semibold text-slate-900'>{title}</h3>
        <p className='mt-1 text-sm text-slate-500'>{description}</p>
      </div>
    </div>
  );
}

export function ErrorState({
  title = 'Nao foi possivel carregar os dados',
  description = 'Verifique sua conexao e tente novamente.',
  onRetry,
  retryLabel = 'Tentar novamente',
  className,
}) {
  return (
    <div className={cn('flex min-h-[280px] items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 p-8', className)}>
      <div className='text-center'>
        <AlertTriangle className='mx-auto mb-3 h-8 w-8 text-red-600' />
        <h3 className='text-lg font-semibold text-red-900'>{title}</h3>
        <p className='mt-1 text-sm text-red-700'>{description}</p>
        {onRetry && (
          <Button className='mt-4' variant='outline' onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title = 'Nenhum resultado encontrado',
  description = 'Ajuste os filtros para visualizar dados.',
  actionLabel,
  onAction,
  icon: Icon = Inbox,
  className,
}) {
  return (
    <div className={cn('flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8', className)}>
      <div className='text-center'>
        <Icon className='mx-auto mb-3 h-8 w-8 text-slate-400' />
        <h3 className='text-lg font-semibold text-slate-900'>{title}</h3>
        <p className='mt-1 text-sm text-slate-500'>{description}</p>
        {actionLabel && onAction && (
          <Button className='mt-4' variant='outline' onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
