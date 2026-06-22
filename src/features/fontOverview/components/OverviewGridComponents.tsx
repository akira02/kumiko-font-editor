import { Grid, Box } from '@chakra-ui/react'
import { forwardRef, type HTMLAttributes } from 'react'

export const OverviewGridList = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function OverviewGridList(props, ref) {
  return (
    <Grid
      ref={ref}
      gridTemplateColumns="repeat(auto-fill, minmax(var(--overview-card-min-width, 120px), 1fr))"
      gap="var(--overview-grid-gap, 12px)"
      {...props}
    />
  )
})

OverviewGridList.displayName = 'OverviewGridList'

export function OverviewGridItem(props: HTMLAttributes<HTMLDivElement>) {
  return <Box {...props} />
}
