import { Box, Container, Grid, Heading, Stack, Text } from "@paul/ui-core";
import { DataTable, type DataTableColumn } from "@paul/ui-patterns/data";
import { PROVIDER_CAPABILITIES } from "../constants";

type CapabilityRow = {
  id: string;
  capability: string;
  contract: string;
  providers: string;
  defaultProvider: string;
  alternativeProvider: string;
};

const rows: CapabilityRow[] = PROVIDER_CAPABILITIES.map((capability) => ({
  id: capability.id,
  capability: capability.label,
  contract: capability.role,
  providers: `${capability.defaultProvider}, ${capability.alternativeProvider}`,
  defaultProvider: capability.defaultProvider,
  alternativeProvider: capability.alternativeProvider,
}));

const columns: Array<DataTableColumn<CapabilityRow>> = [
  {
    key: "capability",
    header: "Capability",
    width: "67%",
    render: (value, row) => (
      <Stack gap="$1">
        <Text css={{ fontFamily: "$nav", fontWeight: "$semibold" }}>{String(value)}</Text>
        <Text size="sm" css={{ color: "$mutedForeground" }}>{row.contract}</Text>
      </Stack>
    ),
  },
  {
    key: "providers",
    header: "Supported providers",
    width: "33%",
    render: (_value, row) => (
      <Stack gap="$1">
        <Text size="xs" css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>{row.defaultProvider}</Text>
        <Text size="xs" css={{ color: "$mutedForeground", fontFamily: "$nav" }}>{row.alternativeProvider}</Text>
      </Stack>
    ),
  },
];

export function ProvidersSection() {
  return (
    <Box as="section" id="providers" css={{ borderTop: "$subtle solid $border", background: "$muted", paddingBlock: "$10" }}>
      <Container>
        <Grid columns={{ initial: "1fr", lg: "minmax(0, .72fr) minmax(0, 1.28fr)" }} gap="$8" css={{ alignItems: "start" }}>
          <Stack gap="$3">
            <Text css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>Provider matrix</Text>
            <Heading size="h2">Four contracts. One manifest.</Heading>
            <Text size="lg" css={{ color: "$mutedForeground" }}>
              Choose DNS, backend, deployment, and mail independently. Every provider stays replaceable.
            </Text>
          </Stack>
          <DataTable caption="VSCD capabilities and supported providers" columns={columns} rows={rows} density="compact" layout="fit" />
        </Grid>
      </Container>
    </Box>
  );
}
