<template>
  <PageShell fluid>
    <div class="as-page">
      <!-- ── Page header ───────────────────────────────────────────────────
           The search field lives up here rather than in a second band inside
           the card: each panel already opens with its own title row, and a
           toolbar above that would have stacked two headers on every section.
           Its placeholder names the active section so the link is explicit. -->
      <header class="as-head">
        <div class="as-head__titles">
          <h1 class="as-head__title">Admin settings</h1>
          <p class="as-head__sub">
            <template v-if="companyName">
              <span>{{ companyName }}</span>
              <span class="as-head__dot" aria-hidden="true">·</span>
            </template>
            <span>{{ activeSection.blurb }}</span>
          </p>
        </div>

        <q-input
          v-if="activeSection.searchable"
          v-model="searchQuery"
          :placeholder="`Search ${activeSection.label.toLowerCase()}`"
          dense
          outlined
          clearable
          hide-bottom-space
          class="as-head__search dash-field"
          :aria-label="`Search ${activeSection.label.toLowerCase()}`"
        >
          <template v-slot:prepend>
            <q-icon name="search" size="18px" />
          </template>
        </q-input>
      </header>

      <div class="as-body">
        <!-- ── Section rail ────────────────────────────────────────────────
             Nine settings sections used to sit in one horizontal q-tabs strip
             that scrolled: past the fourth tab, the rest were off-screen with
             nothing to say so. A vertical rail shows all nine at once and has
             room to group them, and it stays put while a long table scrolls. -->
        <nav class="as-rail" aria-label="Settings sections">
          <div v-for="group in sectionGroups" :key="group.title" class="as-rail__group">
            <p class="as-rail__group-title">{{ group.title }}</p>
            <button
              v-for="section in group.sections"
              :key="section.name"
              type="button"
              class="as-rail__item"
              :class="{ 'is-active': activeTab === section.name }"
              :aria-current="activeTab === section.name ? 'page' : undefined"
              @click="activeTab = section.name"
            >
              <q-icon :name="section.icon" size="18px" class="as-rail__icon" />
              <span class="as-rail__label">{{ section.label }}</span>
            </button>
          </div>
        </nav>

        <section class="as-surface">
          <!-- Below the rail's breakpoint the same nine sections become a
               wrapping strip. Wrapping, not scrolling: every section stays
               visible and reachable without a hidden overflow. -->
          <div class="as-strip" aria-label="Settings sections">
            <button
              v-for="section in sections"
              :key="section.name"
              type="button"
              class="as-strip__item"
              :class="{ 'is-active': activeTab === section.name }"
              :aria-pressed="activeTab === section.name"
              @click="activeTab = section.name"
            >
              <q-icon :name="section.icon" size="16px" />
              <span>{{ section.label }}</span>
            </button>
          </div>

          <!-- Phone. Nine pills wrap to five rows of labels before the table
               starts, and dropping the labels leaves nine icons that do not
               all read on their own — a named picker is one row and unambiguous. -->
          <div class="as-picker">
            <q-select
              v-model="activeTab"
              :options="sections"
              option-value="name"
              option-label="label"
              emit-value
              map-options
              dense
              outlined
              hide-bottom-space
              popup-content-class="dash-popup"
              class="dash-field"
              aria-label="Settings section"
            >
              <template v-slot:prepend>
                <q-icon :name="activeSection.icon" size="18px" />
              </template>
            </q-select>
          </div>

          <q-tab-panels
            v-model="activeTab"
            animated
            transition-prev="fade"
            transition-next="fade"
            class="as-panels"
          >
            <q-tab-panel name="sites" class="q-pa-none">
              <AdminSettingsPanelSites :search-query="searchQuery || ''" />
            </q-tab-panel>
            <q-tab-panel name="departments" class="q-pa-none">
              <AdminSettingsPanelDepartments :search-query="searchQuery || ''" />
            </q-tab-panel>
            <q-tab-panel name="positions" class="q-pa-none">
              <AdminSettingsPanelPositions :search-query="searchQuery || ''" />
            </q-tab-panel>
            <q-tab-panel name="cost-centers" class="q-pa-none">
              <AdminSettingsPanelCostCenters :search-query="searchQuery || ''" />
            </q-tab-panel>
            <!-- Contract types and shifts declare no `searchQuery` prop, so the
                 page used to hand them an attribute they dropped on their root
                 element. They are marked unsearchable instead. -->
            <q-tab-panel name="contract-types" class="q-pa-none">
              <AdminSettingsPanelContractTypes />
            </q-tab-panel>
            <q-tab-panel name="roles" class="q-pa-none">
              <AdminSettingsPanelRoles :search-query="searchQuery || ''" />
            </q-tab-panel>
            <q-tab-panel name="shifts" class="q-pa-none">
              <AdminSettingsPanelShifts />
            </q-tab-panel>
            <q-tab-panel name="custom-multipliers" class="q-pa-none">
              <AdminSettingsPanelCustomMultipliers />
            </q-tab-panel>
            <q-tab-panel name="payroll-groups" class="q-pa-none">
              <AdminSettingsPanelPayrollGroups :search-query="searchQuery || ''" />
            </q-tab-panel>
          </q-tab-panels>
        </section>
      </div>
    </div>
  </PageShell>
</template>

<script setup>
import PageShell from '@/components/layout/PageShell.vue'
import { computed, ref, watch } from 'vue'
import { useCompany } from '@/composables/page/useCompany'

import AdminSettingsPanelSites from '@/components/pages/AdminSettings/AdminSettingsPanelSites.vue'
import AdminSettingsPanelRoles from '@/components/pages/AdminSettings/AdminSettingsPanelRoles.vue'
import AdminSettingsPanelShifts from '@/components/pages/AdminSettings/AdminSettingsPanelShifts.vue'
import AdminSettingsPanelDepartments from '@/components/pages/AdminSettings/AdminSettingsPanelDepartments.vue'
import AdminSettingsPanelPositions from '@/components/pages/AdminSettings/AdminSettingsPanelPositions.vue'
import AdminSettingsPanelContractTypes from '@/components/pages/AdminSettings/AdminSettingsPanelContractTypes.vue'
import AdminSettingsPanelCustomMultipliers from '@/components/pages/AdminSettings/AdminSettingsPanelCustomMultipliers.vue'
import AdminSettingsPanelCostCenters from '@/components/pages/AdminSettings/AdminSettingsPanelCostCenters.vue'
import AdminSettingsPanelPayrollGroups from '@/components/pages/AdminSettings/AdminSettingsPanelPayrollGroups.vue'

const { company } = useCompany()

const activeTab = ref('sites')
const searchQuery = ref('')

const companyName = computed(() => company.value?.name || '')

/**
 * The nine sections, grouped by what an admin is actually setting up. Nine
 * peers in one flat strip gave no hint that "Cost centers" sits nearer to
 * "Departments" than to "Custom multipliers"; the groups say so.
 *
 * `searchable` mirrors reality rather than intent: three panels never declared
 * the `searchQuery` prop, so a search box on those sections would have done
 * nothing.
 */
const sectionGroups = [
  {
    title: 'Organization',
    sections: [
      {
        name: 'sites',
        label: 'Sites',
        icon: 'o_place',
        searchable: true,
        blurb: 'Work locations and their geofences',
      },
      {
        name: 'departments',
        label: 'Departments',
        icon: 'o_corporate_fare',
        searchable: true,
        blurb: 'Departments and their policies',
      },
      {
        name: 'positions',
        label: 'Positions',
        icon: 'o_badge',
        searchable: true,
        blurb: 'Job titles employees are assigned to',
      },
      {
        name: 'cost-centers',
        label: 'Cost centers',
        icon: 'o_account_balance',
        searchable: true,
        blurb: 'Where payroll cost is booked',
      },
    ],
  },
  {
    title: 'Employment',
    sections: [
      {
        name: 'contract-types',
        label: 'Contract types',
        icon: 'o_description',
        searchable: false,
        blurb: 'Contract templates and their pay rules',
      },
      {
        name: 'roles',
        label: 'Permissions',
        icon: 'o_admin_panel_settings',
        searchable: true,
        blurb: 'Roles and what each one can reach',
      },
    ],
  },
  {
    title: 'Time and pay',
    sections: [
      {
        name: 'shifts',
        label: 'Shifts',
        icon: 'o_schedule',
        searchable: false,
        blurb: 'Shift types and weekly templates',
      },
      {
        name: 'custom-multipliers',
        label: 'Custom multipliers',
        icon: 'o_percent',
        searchable: false,
        blurb: 'Overtime, night and holiday rates',
      },
      {
        name: 'payroll-groups',
        label: 'Payroll groups',
        icon: 'o_groups',
        searchable: true,
        blurb: 'Who is paid together, and when',
      },
    ],
  },
]

const sections = sectionGroups.flatMap((group) => group.sections)

const activeSection = computed(
  () => sections.find((section) => section.name === activeTab.value) ?? sections[0],
)

// A term typed on one section would otherwise carry into the next and hide rows
// there with no visible cause — the field is per-section, so its value is too.
watch(activeTab, () => {
  searchQuery.value = ''
})
</script>

<style scoped>
.as-page {
  display: flex;
  flex-direction: column;
  gap: var(--dash-gap);
}

/* ── Header ── */
.as-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.as-head__titles {
  min-width: 0;
}

.as-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: var(--dash-ink);
}

.as-head__sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 6px;
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--dash-ink-3);
}

.as-head__dot {
  color: var(--dash-n-300);
}

.as-head__search {
  flex: 0 1 280px;
  min-width: 200px;
}
.as-head__search :deep(.q-field__control) {
  height: 36px;
  min-height: 36px;
  border-radius: var(--dash-r-md);
  background: var(--dash-surface);
}
.as-head__search :deep(.q-field__native) {
  font-size: 13px;
  color: var(--dash-ink);
}
.as-head__search :deep(.q-field__marginal) {
  height: 36px;
  color: var(--dash-ink-4);
}

/* ── Body ── */
/* The rail is deliberately narrow. Its widest label — "Custom multipliers" —
   needs about 155px with its icon and padding, so 176px carries every section
   with room to spare, and the ~48px that buys goes to the section content. The
   contract-types table is the one that needs it: at 224px it was two multiplier
   columns short of fitting, and those columns are the reason people open it. */
.as-body {
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  gap: var(--dash-gap);
  align-items: start;
}

/* ── Rail ── */
.as-rail {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 10px;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
  /* Stays put while a long settings table scrolls past it, so switching
     section never means scrolling back to the top first. */
  position: sticky;
  top: calc(var(--header-h, 60px) + 14px);
}

.as-rail__group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.as-rail__group-title {
  margin: 0 0 4px;
  padding: 0 10px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dash-ink-4);
}

.as-rail__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: var(--dash-r-md);
  color: var(--dash-ink-2);
  cursor: pointer;
  transition:
    background var(--dash-fast) var(--dash-ease),
    color var(--dash-fast) var(--dash-ease);
}
.as-rail__item:hover {
  background: var(--dash-n-50);
  color: var(--dash-ink);
}
.as-rail__item:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--dash-surface),
    0 0 0 4px var(--dash-accent-ring);
}
/* Selection is a filled plate, not a left border — a 3px rail marker inside a
   224px column read as an artefact of the card edge next to it. */
.as-rail__item.is-active {
  background: var(--dash-brand);
  color: #ffffff;
}
.as-rail__icon {
  flex: none;
  color: var(--dash-ink-4);
}
.as-rail__item:hover .as-rail__icon {
  color: var(--dash-ink-2);
}
.as-rail__item.is-active .as-rail__icon {
  color: rgba(255, 255, 255, 0.85);
}
.as-rail__label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Surface ── */
.as-surface {
  min-width: 0;
  background: var(--dash-surface);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-lg);
  box-shadow: var(--dash-shadow-xs);
  overflow: hidden;
}

/* Only one of the three section pickers is ever on screen: the rail above
   1280, the strip between 600 and 1279, the select below 600. */
.as-strip,
.as-picker {
  display: none;
}

.as-panels {
  background: transparent;
}
.as-panels :deep(.q-tab-panel) {
  padding: 0;
}

@media (min-width: 1440px) {
  .as-head__title {
    font-size: 24px;
  }
  .as-body {
    grid-template-columns: 200px minmax(0, 1fr);
  }
}

/* ── Laptop and below ──
   Under 1280 the app's own sidebar plus a 224px rail left the settings tables
   too little room, so the rail folds into a wrapping strip on the card's top
   edge and the content takes the full width. */
@media (max-width: 1279px) {
  .as-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .as-rail {
    display: none;
  }
  .as-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--dash-line);
    background: var(--dash-n-25);
  }
  .as-strip__item {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 11px;
    background: var(--dash-surface);
    border: 1px solid var(--dash-line);
    border-radius: var(--dash-r-md);
    color: var(--dash-ink-2);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background var(--dash-fast) var(--dash-ease),
      border-color var(--dash-fast) var(--dash-ease),
      color var(--dash-fast) var(--dash-ease);
  }
  .as-strip__item:hover {
    border-color: var(--dash-line-strong);
    color: var(--dash-ink);
  }
  .as-strip__item:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--dash-accent-ring);
  }
  .as-strip__item.is-active {
    background: var(--dash-brand);
    border-color: var(--dash-brand);
    color: #ffffff;
  }
}

/* ── Tablet ── */
@media (max-width: 1023px) {
  .as-head {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .as-head__search {
    flex: 1 1 auto;
  }
  .as-strip {
    padding: 10px;
  }
}

@media (max-width: 599px) {
  .as-head__title {
    font-size: 20px;
  }
  .as-strip {
    display: none;
  }
  .as-picker {
    display: block;
    padding: 10px;
    border-bottom: 1px solid var(--dash-line);
    background: var(--dash-n-25);
  }
  .as-picker :deep(.q-field__control) {
    height: 38px;
    min-height: 38px;
    border-radius: var(--dash-r-md);
    background: var(--dash-surface);
  }
  .as-picker :deep(.q-field__native) {
    font-size: 13px;
    font-weight: 500;
    color: var(--dash-ink);
    min-height: 38px;
  }
  .as-picker :deep(.q-field__marginal) {
    height: 38px;
    color: var(--dash-ink-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .as-rail__item,
  .as-strip__item {
    transition: none;
  }
}
</style>
