export interface BookModel {
  id: string
  title: string
}

export const AClockworkOrange: BookModel = Object.freeze({
  id: 'aco',
  title: 'A Clockwork Orange'
})

export const AnimalFarm: BookModel = Object.freeze({
  id: 'af',
  title: 'Animal Farm'
})

export const TheGreatGatsby: BookModel = Object.freeze({
  id: 'tgg',
  title: 'The Great Gatsby'
})
