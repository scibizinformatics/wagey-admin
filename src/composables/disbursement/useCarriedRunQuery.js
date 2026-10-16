import { computed } from 'vue'
import { useRoute } from 'vue-router'

/**
 * The run's identity, carried between its own step pages in the query.
 *
 * The list page hands the run's status, name and cutoff over when a row is
 * opened, and no step endpoint returns any of them — so a step that dropped the
 * query left the next step's header shimmering and its stepper refetching its
 * progress. The identity does not change between a run's own steps, so every
 * link between them carries these three keys and nothing else.
 *
 * Shared by the progress header's step links and the shell's "moved on" notice,
 * which are the two places one step links to another.
 */
export function useCarriedRunQuery() {
  const route = useRoute()
  return computed(() => {
    const { pgi_status: status, group, cutoff } = route.query
    const query = {}
    if (status) query.pgi_status = status
    if (group) query.group = group
    if (cutoff) query.cutoff = cutoff
    return query
  })
}
