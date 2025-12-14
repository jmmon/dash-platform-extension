import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, FingerprintIcon, FaceIcon } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { OptionSelector, type OptionItem } from '../../components/controls'

export type IdentityType = 'regular' | 'masternode'

const identityOptions: OptionItem[] = [
  {
    id: 'regular',
    label: 'Identity',
    boldLabel: 'Regular',
    icon: FaceIcon
  },
  {
    id: 'masternode',
    label: 'Identity',
    boldLabel: 'Masternode',
    icon: FingerprintIcon
  }
]

function SelectImportTypesState (): React.JSX.Element {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<IdentityType | null>(null)

  const handleNext = (): void => {
    if (selectedType == null) return

    const route = selectedType === 'regular'
      ? '/import-regular-identity'
      : '/import-masternode-identity'
    void navigate(route)
  }

  return (
    <form
      className='flex flex-col gap-2 flex-1 -mt-16 pb-2'
      onSubmit={(e) => {
        e.preventDefault();
        handleNext()
      }}
    >
      <TitleBlock
        title='Identity Type'
        description='Choose what Identity type you will import to your wallet.'
      />

      <div className='flex flex-col gap-[0.875rem]'>
        <OptionSelector
          options={identityOptions}
          selectedId={selectedType}
          onOptionSelect={(id) => {
            // first enter/space will select, second will go Next
            // or tab down to next and hit enter to submit
            if (id === selectedType) handleNext()
            else setSelectedType(id as IdentityType)
          }}
        />

        <div className='mt-4'>
          <Button
            type='submit'
            colorScheme='brand'
            className='w-full'
            disabled={selectedType == null}
          >
            Next
          </Button>
        </div>
      </div>
    </form>
  )
}

export default withAccessControl(SelectImportTypesState, {
  requireWallet: false
})
