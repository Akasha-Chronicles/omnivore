import { Button } from './Button'
import { SpanBox, HStack } from './LayoutPrimitives'
import { Circle, X } from 'phosphor-react'
import { isDarkTheme } from '../../lib/themeUpdater'
import { theme } from '../tokens/stitches.config'

type EditLabelChipProps = {
  text: string
  color: string
  isSelected?: boolean
  isRecommended?: boolean
  xAction: () => void
  addAction?: () => void
}

export function EditLabelChip(props: EditLabelChipProps): JSX.Element {
  const isDark = isDarkTheme()

  const selectedBorder = isDark ? '#FFEA9F' : '$omnivoreGray'
  const unSelectedBorder = isDark ? 'transparent' : '#DEDEDE'
  const xSelectedColor = isDark
    ? '#FFEA9F'
    : theme.colors.omnivoreGray.toString()
  const xUnselectedColor = isDark ? '#6A6968' : '#2A2A2A'

  return (
    <SpanBox
      css={{
        display: 'inline-table',
        margin: '2px',
        fontSize: '11px',
        fontWeight: '500',
        fontFamily: '$inter',
        padding: '1px 7px',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        backgroundClip: 'padding-box',
        borderRadius: '5px',
        borderWidth: '1px',
        borderStyle: 'solid',
        opacity: props.isRecommended ? "50%": "100%",
        color: isDark ? '#EBEBEB' : '#2A2A2A',
        borderColor: props.isSelected ? selectedBorder : unSelectedBorder,
        backgroundColor: isDark ? '#2A2A2A' : '#F9F9F9',
      }}
    >
      <HStack alignment="center" css={{ gap: '7px' }}>
        <Circle size={14} color={props.color} weight="fill" />
        <SpanBox css={{ pt: '1px' }}>{props.text}</SpanBox>
        <Button
          style="ghost"
          css={{ display: 'flex', pt: '1px' }}
          onClick={(event) => {
            !props.isRecommended ? props.xAction() : props.addAction()
            event.preventDefault()
          }}
        >
          <X
            size={14}
            color={props.isSelected ? xSelectedColor : xUnselectedColor}
            style={{ rotate: props.isRecommended ? "45deg" : "0deg"}}
          />
        </Button>
      </HStack>
    </SpanBox>
  )
}
