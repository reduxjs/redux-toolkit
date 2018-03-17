import { connect } from 'react-redux'
import createSelector from 'selectorator'
import { setVisibilityFilter } from '../actions'
import Link from '../components/Link'

const getVisibility = createSelector(
  ['visibilityFilter', { path: 'filter', argIndex: 1 }],
  (visibilityFilter, filter) => {
    return filter === visibilityFilter
  }
)

const mapStateToProps = createSelector({ active: getVisibility })

const mapDispatchToProps = (dispatch, ownProps) => ({
  onClick: () => {
    dispatch(setVisibilityFilter(ownProps.filter))
  }
})

const FilterLink = connect(mapStateToProps, mapDispatchToProps)(Link)

export default FilterLink
