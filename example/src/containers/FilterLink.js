import { connect } from 'react-redux'
import { createSelector } from '@acemarke/redux-starter-kit'
import { setVisibilityFilter } from '../actions'
import Link from '../components/Link'

const getFilter = (_, props) => props.filter

const getVisibility = createSelector(['visibilityFilter', getFilter], (visibilityFilter, filter) => (
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
