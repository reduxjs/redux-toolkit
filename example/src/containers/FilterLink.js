import { connect } from 'react-redux'
import createSelector from 'selectorator'
import { setVisibilityFilter } from '../actions'
import Link from '../components/Link'

const getVisibility = createSelector(['visibilityFilter', { path: 'filter', argIndex: 1 }], (visibilityFilter, filter) => (
  filter === visibilityFilter
))

const mapStateToProps = (state, ownProps) => ({
  active: getVisibility(state, ownProps)
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  onClick: () => {
    dispatch(setVisibilityFilter(ownProps.filter))
  }
})

const FilterLink = connect(
  mapStateToProps,
  mapDispatchToProps
)(Link)

export default FilterLink
