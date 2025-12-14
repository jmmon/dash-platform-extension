import React, { useState, useEffect } from 'react'
import { useExtensionAPI, useSdk } from '../../hooks'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type {
  OutletContext,
  MasternodeIdentityInput,
  IdentityPublicKey,
  PublicKeyData,
  MasternodeIdentityPreviewData
} from '../../types'
import {
  Button,
  Text,
  ValueCard,
  Input
} from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { WalletType, type NetworkType } from '../../../types'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { PrivateKeyInput, type PrivateKeyInputData } from '../../components/keys'
import { parsePrivateKey } from '../../../utils'
import { IdentityPreview } from '../../components/Identities'
import { PrivateKeyWASM } from 'pshenmic-dpp'

type KeyType = 'ownerKey' | 'votingKey' | 'payoutKey'

function ImportMasternodeState (): React.JSX.Element {
  const navigate = useNavigate()
  const { currentWallet, currentNetwork, setCurrentIdentity } = useOutletContext<OutletContext>()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [formData, setFormData] = useState<MasternodeIdentityInput>({
    proTxHash: '',
    ownerKey: '',
    votingKey: '',
    payoutKey: ''
  })

  const [keysData, setKeysData] = useState<Record<keyof MasternodeIdentityInput, PrivateKeyInputData>>({
    proTxHash: {
      id: 'pro-tx-hash',
      value: '',
      isVisible: true,
      hasError: false,
    },
    ownerKey: {
      id: 'owner-key',
      value: '',
      isVisible: false,
      hasError: false
    },
    votingKey: {
      id: 'voting-key',
      value: '',
      isVisible: false,
      hasError: false
    },
    payoutKey: {
      id: 'payout-key',
      value: '',
      isVisible: false,
      hasError: false
    }
  })

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<MasternodeIdentityPreviewData | null>(null)

  // Check wallet type
  useEffect(() => {
    const checkWalletType = async (): Promise<void> => {
      if (currentWallet == null) {
        void navigate('/choose-wallet-type')
        return
      }

      try {
        const wallets = await extensionAPI.getAllWallets()
        const currentWalletInfo = wallets.find(wallet => wallet.walletId === currentWallet)

        if (currentWalletInfo?.type !== WalletType.keystore) {
          void navigate('/choose-wallet-type')
        }
      } catch (error) {
        console.log('Failed to check wallet type:', error)
        void navigate('/choose-wallet-type')
      }
    }

    void checkWalletType().catch(console.log)
  }, [currentWallet, extensionAPI, navigate])

  // Reset preview when form data changes
  useEffect(() => {
    setShowPreview(false)
    setPreviewData(null)
  }, [formData])

  const updateField = (field: keyof MasternodeIdentityInput, value: string | number): void => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setShowPreview(false)
    setPreviewData(null)
  }

  const updateKey = (field: keyof MasternodeIdentityInput) => (id: string, value: string): void => {
    setKeysData(prev => ({
      ...prev,
      [field]: { ...prev[field], value, hasError: false }
    }))
    updateField(field, value)
  }

  const toggleKeyVisibility = (keyType: KeyType) => (): void => {
    setKeysData(prev => ({
      ...prev,
      [keyType]: { ...prev[keyType], isVisible: !prev[keyType].isVisible }
    }))
  }

  const setInputError = (field: keyof MasternodeIdentityInput, hasError: boolean): void => {
    setKeysData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        hasError,
      }
    }));
  }

  // Helper: Map public keys to UI format
  const mapPublicKeys = (
    keys: IdentityPublicKey[],
    availableHashes: string[]
  ): PublicKeyData[] => {
    return keys.map(pk => ({
      keyId: pk.keyId,
      purpose: String(pk.purpose ?? 'UNKNOWN'),
      securityLevel: String(pk.securityLevel ?? 'UNKNOWN'),
      type: String(pk.keyType ?? 'UNKNOWN'),
      isAvailable: availableHashes.includes(pk.getPublicKeyHash())
    }))
  }

  // Step 1: Validate and parse keys
  const validateKeys = (network: NetworkType): {
    ownerKeyHex: string
    ownerKeyWASM: PrivateKeyWASM
    votingKeyHex?: string
    votingKeyWASM?: PrivateKeyWASM
    payoutKeyHex?: string
    payoutKeyWASM?: PrivateKeyWASM
  } => {
    let ownerKeyHex: string | undefined;
    let ownerKeyWASM: PrivateKeyWASM | undefined;
    try {
      ownerKeyHex = parsePrivateKey(formData.ownerKey, network).hex()
      ownerKeyWASM = PrivateKeyWASM.fromHex(ownerKeyHex!, network)
    } catch(e) {
      setInputError('ownerKey', true);
      throw new Error(e);
    }

    let votingKeyHex: string | undefined
    let votingKeyWASM: PrivateKeyWASM | undefined
    if (formData.votingKey.trim() !== '') {
      try {
        votingKeyHex = parsePrivateKey(formData.votingKey, network).hex()
        votingKeyWASM = PrivateKeyWASM.fromHex(votingKeyHex, network)
      } catch(e) {
        setInputError('votingKey', true);
        throw new Error(e);
      }

      if (votingKeyHex === ownerKeyHex) {
        setInputError('ownerKey', true);
        setInputError('votingKey', true);
        throw new Error('Voting key must differ from owner key')
      }
    }

    let payoutKeyHex: string | undefined
    let payoutKeyWASM: PrivateKeyWASM | undefined
    if (formData.payoutKey.trim() !== '') {
      try {
        payoutKeyHex = parsePrivateKey(formData.payoutKey, network).hex()
        payoutKeyWASM = PrivateKeyWASM.fromHex(payoutKeyHex, network)
      } catch(e) {
        setInputError('payoutKey', true);
        throw new Error(e);
      }

      if (payoutKeyHex === ownerKeyHex) {
        setInputError('payoutKey', true);
        setInputError('ownerKey', true);
        throw new Error('Payout key must differ from owner key')
      }
      if (votingKeyHex !== undefined && payoutKeyHex === votingKeyHex) {
        setInputError('payoutKey', true);
        setInputError('ownerKey', true);
        throw new Error('Payout key must differ from voting key')
      }
    }

    return {
      ownerKeyHex,
      ownerKeyWASM,
      votingKeyHex,
      votingKeyWASM,
      payoutKeyHex,
      payoutKeyWASM
    }
  }

  // Step 2: Fetch identities from network
  const fetchIdentitiesFromNetwork = async (
    ownerKeyWASM: PrivateKeyWASM,
    votingKeyWASM?: PrivateKeyWASM
  ): Promise<{
    masternodeIdentifier: any
    voterIdentifier: any
    masternodeIdentity: any
    voterIdentity: any
    masternodeBalance: bigint
    voterBalance: bigint
  }> => {
    const masternodeIdentifier = sdk.utils.createMasternodeIdentifier(formData.proTxHash)
    const voterIdentifier = await sdk.utils.createVoterIdentifier(
      formData.proTxHash,
      (votingKeyWASM ?? ownerKeyWASM).getPublicKeyHash()
    )

    const masternodeIdentity = await sdk.identities.getIdentityByIdentifier(masternodeIdentifier.base58())
    const voterIdentity = await sdk.identities.getIdentityByIdentifier(voterIdentifier.base58())

    if (masternodeIdentity == null) {
      throw new Error('Masternode identity not found on network')
    }
    if (voterIdentity == null) {
      throw new Error('Voter identity not found on network')
    }

    const masternodeBalance = await sdk.identities.getIdentityBalance(masternodeIdentifier.base58())
    const voterBalance = await sdk.identities.getIdentityBalance(voterIdentifier.base58())

    return {
      masternodeIdentifier,
      voterIdentifier,
      masternodeIdentity,
      voterIdentity,
      masternodeBalance,
      voterBalance
    }
  }

  // Step 3: Validate keys match identities
  const validateKeysMatchIdentities = (
    masternodePublicKeys: IdentityPublicKey[],
    voterPublicKeys: IdentityPublicKey[],
    ownerKeyWASM: PrivateKeyWASM,
    votingKeyWASM: PrivateKeyWASM | undefined,
    payoutKeyWASM: PrivateKeyWASM | undefined
  ): void => {
    const ownerPublicKeyMatch = masternodePublicKeys.find(pk =>
      pk.getPublicKeyHash() === ownerKeyWASM.getPublicKeyHash()
    )
    if (ownerPublicKeyMatch == null) {
      setInputError('ownerKey', true);
      throw new Error('Owner key does not match masternode identity')
    }

    const votingKeyToCheck = votingKeyWASM ?? ownerKeyWASM
    const votingPublicKeyMatch = voterPublicKeys.find(pk =>
      pk.getPublicKeyHash() === votingKeyToCheck.getPublicKeyHash()
    )
    if (votingPublicKeyMatch == null) {
      setInputError('votingKey', true);
      throw new Error('Voting key does not match voter identity')
    }

    if (payoutKeyWASM != null) {
      const payoutPublicKeyMatch = masternodePublicKeys.find(pk =>
        pk.getPublicKeyHash() === payoutKeyWASM.getPublicKeyHash()
      )
      if (payoutPublicKeyMatch == null) {
        setInputError('payoutKey', true);
        throw new Error('Payout key does not match masternode identity')
      }
    }
  }

  // Step 4: Prepare preview data
  const preparePreviewData = (
    masternodeIdentifier: any,
    voterIdentifier: any,
    masternodePublicKeys: IdentityPublicKey[],
    voterPublicKeys: IdentityPublicKey[],
    masternodeBalance: bigint,
    voterBalance: bigint,
    ownerKeyWASM: PrivateKeyWASM,
    votingKeyWASM: PrivateKeyWASM | undefined,
    payoutKeyWASM: PrivateKeyWASM | undefined,
    ownerKeyHex: string,
    votingKeyHex?: string,
    payoutKeyHex?: string
  ): MasternodeIdentityPreviewData => {
    const identities: MasternodeIdentityPreviewData['identities'] = []

    // Masternode identity
    const availableHashes = [ownerKeyWASM.getPublicKeyHash()]
    if (payoutKeyWASM != null) {
      availableHashes.push(payoutKeyWASM.getPublicKeyHash())
    }

    identities.push({
      id: masternodeIdentifier.base58(),
      type: 'masternode' as const,
      balance: masternodeBalance.toString(),
      publicKeys: mapPublicKeys(masternodePublicKeys, availableHashes)
    })

    // Voter identity
    const votingKeyToCheck = votingKeyWASM ?? ownerKeyWASM
    identities.push({
      id: voterIdentifier.base58(),
      type: 'voting' as const,
      balance: voterBalance.toString(),
      publicKeys: mapPublicKeys(voterPublicKeys, [votingKeyToCheck.getPublicKeyHash()])
    })

    return {
      identities,
      keys: {
        ownerHex: ownerKeyHex,
        votingHex: votingKeyHex,
        payoutHex: payoutKeyHex
      },
      proTxHash: formData.proTxHash
    }
  }

  const checkMasternodeKeys = async (): Promise<void> => {
    setError(null)
    setIsLoading(true)

    try {
      // Validate required fields
      if (formData.proTxHash.trim() === '') {
        setInputError('proTxHash', true);
        throw new Error('Pro TX Hash is required')
      }
      if (formData.ownerKey.trim() === '') {
        setInputError('ownerKey', true);
        throw new Error('Owner Key is required')
      }

      const network = currentNetwork as NetworkType

      // Step 1: Validate and parse keys
      const {
        ownerKeyHex,
        ownerKeyWASM,
        votingKeyHex,
        votingKeyWASM,
        payoutKeyHex,
        payoutKeyWASM
      } = validateKeys(network)

      // Step 2: Fetch identities from network
      const {
        masternodeIdentifier,
        voterIdentifier,
        masternodeIdentity,
        voterIdentity,
        masternodeBalance,
        voterBalance
      } = await fetchIdentitiesFromNetwork(ownerKeyWASM, votingKeyWASM)

      // Get public keys
      const masternodePublicKeys = masternodeIdentity.getPublicKeys() as IdentityPublicKey[]
      const voterPublicKeys = voterIdentity.getPublicKeys() as IdentityPublicKey[]

      // Step 3: Validate keys match identities
      validateKeysMatchIdentities(
        masternodePublicKeys,
        voterPublicKeys,
        ownerKeyWASM,
        votingKeyWASM,
        payoutKeyWASM
      )

      // Step 4: Prepare preview data
      const preview = preparePreviewData(
        masternodeIdentifier,
        voterIdentifier,
        masternodePublicKeys,
        voterPublicKeys,
        masternodeBalance,
        voterBalance,
        ownerKeyWASM,
        votingKeyWASM,
        payoutKeyWASM,
        ownerKeyHex,
        votingKeyHex,
        payoutKeyHex
      )

      setPreviewData(preview)
      setShowPreview(true)
    } catch (e) {
      console.log('checkMasternodeKeys error', e)
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const confirmImport = async (): Promise<void> => {
    if (previewData == null) return

    setError(null)
    setIsLoading(true)

    try {
      // Import masternode identity
      await extensionAPI.importMasternodeIdentity(
        previewData.proTxHash,
        previewData.keys.ownerHex,
        previewData.keys.votingHex,
        previewData.keys.payoutHex
      )

      // Set first identity as current
      if (previewData.identities.length > 0) {
        setCurrentIdentity(previewData.identities[0].id)
      }

      void navigate('/home')
    } catch (e) {
      console.log('confirmImport error', e)
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = formData.proTxHash.trim() !== '' &&
    formData.ownerKey.trim() !== ''

  // Show preview if available
  if (showPreview && previewData != null) {
    return (
      <div className='flex flex-col gap-2 flex-1 -mt-16 pb-2'>
        <TitleBlock
          title='Import Masternode Identity'
          description='Verify the masternode identities before importing.'
        />

        {/* Show all identities (masternode + voter) */}
        <div className='flex flex-col gap-4'>
          {previewData.identities.map((identity) => (
            <div key={identity.id}>
              <Text size='sm' weight='medium' className='mb-2 text-gray-700'>
                {identity.type === 'masternode' ? 'Masternode Identity' : 'Voter Identity'}
              </Text>
              <IdentityPreview
                identity={{
                  id: identity.id,
                  balance: identity.balance,
                  publicKeys: identity.publicKeys
                }}
              />
            </div>
          ))}
        </div>

        <Button
          colorScheme='brand'
          disabled={isLoading}
          className='w-full h-[3.625rem] mt-4'
          onClick={() => {
            confirmImport().catch(e => console.log('confirmImport error', e))
          }}
        >
          {isLoading ? 'Importing...' : 'Import Identities'}
        </Button>

        {error !== null && (
          <ValueCard colorScheme='yellow' className='break-all'>
            <Text color='red'>{error}</Text>
          </ValueCard>
        )}
      </div>
    )
  }

  return (
    <form
      className='flex flex-col gap-2 flex-1 -mt-16 pb-2'
      onSubmit={(e) => {
        e.preventDefault();
        checkMasternodeKeys().catch(e => console.log('checkMasternodeKeys error', e))
      }}
    >

      <TitleBlock
        title='Import Masternode Identity'
        description='Enter your masternode credentials to continue.'
      />

      <div className='flex flex-col gap-[0.875rem]'>
        {/* Pro TX Hash */}
        <div className='flex flex-col gap-2'>
          <Text dim>Pro TX Hash</Text>
          <Input
            colorScheme={(keysData.proTxHash.hasError === true) ? 'error' : 'default'}
            autoFocus={true}
            placeholder='Enter Pro TX Hash...'
            value={formData.proTxHash}
            onChange={(e) => updateKey('proTxHash')('', e.target.value)}
            size='xl'
          />
        </div>

        {/* Owner Key */}
        <div className='flex flex-col gap-2'>
          <Text dim>Owner Key</Text>
          <PrivateKeyInput
            input={keysData.ownerKey}
            placeholder='Enter Owner Key...'
            onValueChange={updateKey('ownerKey')}
            onVisibilityToggle={toggleKeyVisibility('ownerKey')}
          />
        </div>

        {/* Voting Key */}
        <div className='flex flex-col gap-2'>
          <Text dim>Voting Key (optional)</Text>
          <PrivateKeyInput
            input={keysData.votingKey}
            placeholder='Enter Voting Key...'
            onValueChange={updateKey('votingKey')}
            onVisibilityToggle={toggleKeyVisibility('votingKey')}
          />
        </div>

        {/* Payout Key */}
        <div className='flex flex-col gap-2'>
          <Text dim>Payout Key (optional)</Text>
          <PrivateKeyInput
            input={keysData.payoutKey}
            placeholder='Enter Payout Key...'
            onValueChange={updateKey('payoutKey')}
            onVisibilityToggle={toggleKeyVisibility('payoutKey')}
          />
        </div>

        {error !== null && (
          <ValueCard colorScheme='yellow' className='break-normal mt-4'>
            <Text color='red'>{error}</Text>
          </ValueCard>
        )}

        <div className='mt-4'>
          <Button
            type='submit'
            colorScheme='brand'
            disabled={!isFormValid || isLoading}
            className='w-full'
          >
            {isLoading ? 'Checking...' : 'Check'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export default withAccessControl(ImportMasternodeState, {
  requireWallet: false
})
