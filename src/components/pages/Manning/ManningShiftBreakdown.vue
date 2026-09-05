<template>
  <div class="man-shifts">
    <table class="man-shifts__table">
      <thead>
        <tr>
          <th class="man-shifts__th">Shift</th>
          <th v-if="showRequired" class="man-shifts__th man-shifts__th--num">Required</th>
          <th class="man-shifts__th man-shifts__th--num">Assigned</th>
          <th class="man-shifts__th man-shifts__th--num">Working</th>
          <th class="man-shifts__th">Attention</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="shift in shifts" :key="shift.key" class="man-shifts__row">
          <td class="man-shifts__td man-shifts__td--name">
            <span class="man-shifts__span">{{ shift.span }}</span>
            <span
              v-if="shift.isGraveyard"
              class="man-shifts__nightmark"
              aria-label="Graveyard shift"
            >
              <q-icon name="o_bedtime" size="12px" />
              <q-tooltip anchor="bottom middle" self="top middle" class="man-tip">
                Graveyard shift
              </q-tooltip>
            </span>
            <span v-if="shift.distinctName" class="man-shifts__label">{{
              shift.distinctName
            }}</span>
          </td>

          <td v-if="showRequired" class="man-shifts__td man-shifts__td--num">
            <span v-if="shift.needed === null" class="man-shifts__dash">—</span>
            <span v-else>{{ shift.needed }}</span>
          </td>

          <td class="man-shifts__td man-shifts__td--num">{{ shift.assigned }}</td>

          <td class="man-shifts__td man-shifts__td--num" :class="`is-${workingTone(shift)}`">
            {{ shift.working }}
          </td>

          <!-- Same treatment as the position row above: only the states somebody
               is actually in, rather than four columns of zeros. -->
          <td class="man-shifts__td">
            <div v-if="shiftAttentionChips(shift).length" class="man-shifts__flags">
              <span
                v-for="chip in shiftAttentionChips(shift)"
                :key="chip.key"
                class="dash-chip man-shifts__flag"
                :class="chip.tone === 'neutral' ? '' : `dash-chip--${chip.tone}`"
              >
                <span class="dash-chip__dot" />
                {{ chip.label }}
              </span>
            </div>
            <span v-else-if="shift.assigned" class="man-shifts__ok">
              <q-icon name="o_check" size="13px" />
              All present
            </span>
            <span v-else class="man-shifts__dash">Nobody assigned</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
/**
 * The shifts behind one position row.
 *
 * A position that reads "2 assigned, 1 working" says nothing about which half of
 * the day is uncovered; this is where that lives, so the parent row can stay a
 * single line.
 *
 * It carries the same five columns as the row above it — shift, required,
 * assigned, working, attention — rather than a second, differently-shaped grid
 * of counts. Opening a row should feel like reading the same table one level
 * deeper, not switching to another one.
 *
 * It is a plain table rather than a QTable: it sits inside a full-width cell of
 * another table and needs its own column widths, not the parent's. A shift has
 * no `off_employees` — a scheduled day off is not tied to a shift — so a day off
 * appears on the position row only.
 */
import { shiftAttentionChips, workingTone } from 'src/composables/utils/manning'

defineProps({
  shifts: { type: Array, default: () => [] },
  /** Hidden when no position on the board carries a headcount requirement. */
  showRequired: { type: Boolean, default: false },
})
</script>

<style scoped>
.man-shifts {
  padding: 2px 0 6px 30px;
  overflow-x: auto;
}

.man-shifts__table {
  width: 100%;
  border-collapse: collapse;
  /* A tint rather than a border box: the breakdown is a continuation of the row
     above it, and a full outline would read as a separate table. */
  background: var(--dash-n-25);
  border: 1px solid var(--dash-line-soft);
  border-radius: var(--dash-r-md);
  overflow: hidden;
}

.man-shifts__th {
  padding: 7px 10px 6px;
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  color: var(--dash-ink-4);
  border-bottom: 1px solid var(--dash-line-soft);
  white-space: nowrap;
}
.man-shifts__th--num {
  text-align: right;
  width: 88px;
}

.man-shifts__row:last-child .man-shifts__td {
  border-bottom: none;
}

.man-shifts__td {
  padding: 7px 10px;
  font-size: 12.5px;
  color: var(--dash-ink-2);
  border-bottom: 1px solid var(--dash-line-soft);
  vertical-align: middle;
}
.man-shifts__td--num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  color: var(--dash-ink);
}
.man-shifts__td--name {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 190px;
}

.man-shifts__span {
  font-weight: 500;
  color: var(--dash-ink);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.man-shifts__label {
  font-size: 11.5px;
  color: var(--dash-ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A soft tint, not a saturated outline: these repeat down a dense grid. */
.man-shifts__nightmark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--dash-r-sm);
  background: var(--dash-cat-4-tint);
  border: 1px solid var(--dash-cat-4-soft);
  color: var(--dash-cat-4);
  flex-shrink: 0;
}

.man-shifts__flags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.man-shifts__flag {
  font-size: 11px;
  padding: 1px 7px 1px 5px;
}

.man-shifts__ok {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--dash-ink-4);
}

.man-shifts__dash {
  color: var(--dash-ink-4);
}

.man-shifts__td--num.is-good {
  color: var(--dash-good);
  font-weight: 600;
}
.man-shifts__td--num.is-warn {
  color: var(--dash-warn);
  font-weight: 600;
}
.man-shifts__td--num.is-critical {
  color: var(--dash-critical);
  font-weight: 600;
}
.man-shifts__td--num.is-neutral {
  color: var(--dash-ink-4);
}

@media (max-width: 1023px) {
  .man-shifts {
    padding-left: 0;
  }
  .man-shifts__th--num {
    width: 74px;
  }
  .man-shifts__td--name {
    min-width: 150px;
  }
}
</style>
