import { FocusEvent, ReactElement, ReactNode } from 'react'
import TextInputField from '../TextInputField'
import SvgButton from '../SvgButton'

interface TextInputWithIconFieldProps {
  htmlId: string
  value: string
  onChange: (newValue: string) => void
  icon: ReactElement
  onIconClick: () => void
  afterInput?: ReactNode
  label?: string
  placeholder?: string
  disabled?: boolean
  extraClass?: string
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
}

const TextInputWithIconField = ({
  icon,
  onIconClick,
  disabled = false,
  ...props
}: TextInputWithIconFieldProps) => {
  return (
    <TextInputField
      {...props}
      disabled={disabled}
      inputIcon={
        <SvgButton
          disabled={disabled}
          onClick={onIconClick}
          className="inputIcon"
        >
          {icon}
        </SvgButton>
      }
    />
  )
}

export default TextInputWithIconField
