// import Benchmark from 'benchmark'
import { Store, MiddlewareAPI, Dispatch } from 'redux'
import faker from 'faker'

import { configureStore } from './configureStore'
import { createSlice } from './createSlice'

import {
  createImmutableStateInvariantMiddleware,
  tm2,
  ImmutableStateInvariantMiddlewareOptions
} from './immutableStateInvariantMiddleware'

export class TaskInfo {
  private _taskName: string
  private _percentage: string | undefined
  private _timeMillis: number

  constructor(taskName: string, timeMillis: number) {
    this._taskName = taskName
    this._timeMillis = timeMillis
  }

  get taskName(): string {
    return this._taskName
  }

  get timeMills(): number {
    return this._timeMillis
  }

  get percentage(): string | undefined {
    return this._percentage
  }

  calculatePercentage(totalTimeMillis: number): string {
    this._percentage = ((this._timeMillis * 100) / totalTimeMillis).toFixed(2)
    return this._percentage
  }
}

export class StopWatch {
  public static NoTaskMessage = 'No task info kept'

  private id: string
  private currentTaskName: string | null = null
  private startTimeMillis = 0
  private totalTimeMillis = 0
  private taskList: Array<TaskInfo> = []

  constructor(id = '') {
    this.id = id
  }

  /**
   * start a task
   */
  start(taskName = ''): void {
    this.currentTaskName !== null &&
      this.throwError("Can't start StopWatch: it's already running")
    this.currentTaskName = taskName
    this.startTimeMillis = Date.now()
  }

  /**
   * stop the current task
   */
  stop(): void {
    this.currentTaskName === null &&
      this.throwError("Can't stop StopWatch: it's not running")
    const lastTime: number = Date.now() - this.startTimeMillis
    this.totalTimeMillis += lastTime
    const lastTaskInfo = new TaskInfo(this.currentTaskName!, lastTime)
    this.taskList.push(lastTaskInfo)
    this.currentTaskName = null
  }

  /**
   * Return a string with a table describing all tasks performed.
   */
  prettyPrint(): string {
    const output: Array<string> = [this.shortSummary()]
    if (this.taskList.length) {
      output.push('------------------------------------------')
      output.push('ms \t\t % \t\t Task name')
      output.push('------------------------------------------')
      this.taskList.forEach((task: TaskInfo) => {
        let percentage = '0'
        try {
          percentage = task.calculatePercentage(this.totalTimeMillis)
        } catch (e) {}
        output.push(
          `${task.timeMills} \t\t ${percentage} \t\t ${task.taskName}`
        )
      })
    } else {
      output.push(StopWatch.NoTaskMessage)
    }
    const outputString = output.join('\n')

    console.info(outputString)
    return outputString
  }

  /**
   * Return a task matching the given name
   */
  getTask(taskName: string): TaskInfo | undefined {
    const task = this.taskList.find(task => task.taskName === taskName)
    if (task) {
      task.calculatePercentage(this.totalTimeMillis)
    }

    return task
  }

  /**
   * Return the total running time in milliseconds
   */
  getTotalTime(): number {
    return this.totalTimeMillis
  }

  /**
   * Return a short description of the total running time.
   */
  shortSummary(): string {
    return `StopWatch '${this.id}' running time (millis) = ${this.totalTimeMillis}`
  }

  /**
   * Return whether the stop watch is currently running
   */
  isRunning(): boolean {
    return this.currentTaskName !== null
  }

  /**
   * Return the number of tasks timed.
   */
  getTaskCount(): number {
    return this.taskList.length
  }

  private throwError(msg: string): never {
    throw new Error(msg)
  }
}

/*
let state: any
const getState: Store['getState'] = () => state

function middleware(options: ImmutableStateInvariantMiddlewareOptions = {}) {
  return createImmutableStateInvariantMiddleware(options)({
    getState
  } as MiddlewareAPI)
}

const next: Dispatch = action => action
*/

function createSliceData() {
  const people = Array.from({ length: 10000 }).map(
    () => faker.helpers.userCard() as any
  )
  people.forEach(person => {
    person.vehicles = Array.from({ length: 2 }).map(() =>
      faker.vehicle.vehicle()
    )
  })

  return people
}

const state: any = {
  a: createSliceData(),
  b: createSliceData(),
  c: createSliceData()
}

// debugger
// let q = 42

const dummySlice = createSlice({
  name: 'dummy',
  initialState: state,
  reducers: {}
})

const originalStore = configureStore({
  reducer: dummySlice.reducer,
  middleware: gdm =>
    gdm({
      // serializableCheck: false
    })
})

function runOriginal() {
  // const dispatch = middleware()(next)
  // dispatch({ type: 'SOME_ACTION' })
  originalStore.dispatch({ type: 'SOME_ACTION' })
}

const queuedStore = configureStore({
  reducer: dummySlice.reducer,
  middleware: gdm =>
    gdm({
      // serializableCheck: false,
      immutableCheck: {
        trackFunction: tm2
      }
    })
})

function runQueued() {
  queuedStore.dispatch({ type: 'SOME_ACTION' })
}
/*
const suite = new Benchmark.Suite('abcd', {
  setup() {
    state = {
      a: createSliceData(),
      b: createSliceData(),
      c: createSliceData()
    }
  }
})

suite
  .add('Original', )
  .add('Queued', )
  .on('cycle', function(event: any) {
    console.log(String(event.target))
  })
  .on('complete', function(this: any) {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run({})
*/

const stopwatch = new StopWatch()

stopwatch.start('Original')
runOriginal()
stopwatch.stop()

stopwatch.start('Queued')
runQueued()
stopwatch.stop()

// debugger

stopwatch.prettyPrint()

// let z = q
