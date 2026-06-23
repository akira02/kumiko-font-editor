import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  FormControl,
  FormLabel,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react'
import type {
  ExportPolicy,
  FeatureDiagnostic,
  OpenTypeExportWarning,
  OpenTypeFeaturesState,
} from 'src/lib/openTypeFeatures'
import {
  createCompilerRuntimeStatus,
  deriveOpenTypeExportImpactItems,
  deriveOpenTypeExportWarnings,
} from 'src/lib/openTypeFeatures'
import { ExportImpactSummary } from 'src/features/common/projectControl/fontSettings/features/components/ExportImpactSummary'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface ExportPolicyControlProps {
  diagnostics: FeatureDiagnostic[]
  state: OpenTypeFeaturesState
  onChange: (policy: ExportPolicy) => void
}

const POLICY_LABELS: Record<ExportPolicy, string> = {
  'rebuild-managed-layout-tables': 'Rebuild managed layout tables',
  'preserve-compiled-layout-tables': 'Preserve compiled layout tables',
  'drop-unsupported-and-rebuild': 'Drop unsupported and rebuild',
}

type AlertStatus = 'error' | 'warning' | 'info'

const getAlertStatus = (
  severity: OpenTypeExportWarning['severity']
): AlertStatus => {
  if (severity === 'error') {
    return 'error'
  }

  if (severity === 'warning') {
    return 'warning'
  }

  return 'info'
}

export function ExportPolicyControl({
  diagnostics,
  state,
  onChange,
}: ExportPolicyControlProps) {
  const { t } = useTranslation()
  const compilerRuntimeStatus = useMemo(() => createCompilerRuntimeStatus(), [])
  const warnings = useMemo(
    () =>
      deriveOpenTypeExportWarnings(state, {
        compilerRuntimeStatus,
        diagnostics,
      }),
    [compilerRuntimeStatus, diagnostics, state]
  )
  const impactItems = useMemo(
    () => deriveOpenTypeExportImpactItems(state),
    [state]
  )

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel fontSize="sm">
          {t('projectControl.opentypeExportPolicy')}
        </FormLabel>
        <Select
          value={state.exportPolicy}
          onChange={(event) => onChange(event.target.value as ExportPolicy)}
        >
          {Object.entries(POLICY_LABELS).map(([policy, label]) => (
            <option key={policy} value={policy}>
              {label}
            </option>
          ))}
        </Select>
      </FormControl>
      <Text fontSize="sm" color="field.muted">
        {t('projectControl.exportBehaviorIsExplicitBecauseCompiling')}
      </Text>
      <ExportImpactSummary items={impactItems} />
      {warnings.map((warning) => (
        <Alert
          key={warning.id}
          status={getAlertStatus(warning.severity)}
          alignItems="flex-start"
          borderRadius="sm"
        >
          <AlertIcon mt={1} />
          <Stack spacing={0}>
            <AlertTitle fontSize="sm">{warning.title}</AlertTitle>
            <AlertDescription fontSize="sm">{warning.message}</AlertDescription>
            {warning.details && warning.details.length > 0 && (
              <Stack as="ul" spacing={1} mt={2} pl={4}>
                {warning.details.slice(0, 8).map((detail) => (
                  <Text key={detail} as="li" fontSize="sm">
                    {detail}
                  </Text>
                ))}
                {warning.details.length > 8 && (
                  <Text as="li" fontSize="sm">
                    +{warning.details.length - 8} more
                  </Text>
                )}
              </Stack>
            )}
          </Stack>
        </Alert>
      ))}
    </Stack>
  )
}
