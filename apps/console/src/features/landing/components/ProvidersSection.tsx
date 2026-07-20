import { Badge, Box, Container, Flex, Heading, Stack, Text } from "@paul/ui-core";
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
      <Flex gap="$2" wrap="wrap" aria-label={`${row.capability} providers`}>
        <Badge tone="info" css={{ minHeight: "$controlCompact", padding: "$1 $2" }}>{row.defaultProvider}</Badge>
        <Badge css={{ minHeight: "$controlCompact", padding: "$1 $2" }}>{row.alternativeProvider}</Badge>
      </Flex>
    ),
  },
];

export function ProvidersSection() {
  return (
    <Box as="section" id="providers" css={{ borderTop: "$subtle solid $border", background: "$muted", paddingBlock: "$10" }}>
      <Container>
        <Stack gap="$5">
          <Stack gap="$3" css={{ maxWidth: "$reading" }}>
            <Text css={{ color: "$primary", fontFamily: "$nav", fontWeight: "$semibold" }}>Four independent capabilities</Text>
            <Heading size="h2">Choose infrastructure by capability.</Heading>
            <Text size="lg" css={{ color: "$mutedForeground" }}>
              Each capability owns one contract. Provider choices stay explicit and replaceable.
            </Text>
          </Stack>
          <DataTable caption="VSCD capabilities and supported providers" columns={columns} rows={rows} density="compact" layout="fit" />
        </Stack>
      </Container>
    </Box>
  );
}
