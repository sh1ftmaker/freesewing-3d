import React, { useState } from 'react'
import {
  getProps,
  defaultComponents as patternComponents,
} from '@freesewing/react/components/Pattern'
import { H5, H6 } from '@freesewing/react/components/Heading'
import { KeyVal } from '@freesewing/react/components/KeyVal'
import { Highlight } from '@freesewing/react/components/Highlight'
import { round, pathLength } from '@freesewing/utils'

const coords = (point) => `${point.x},${point.y}`

const Cp = ({ at }) => (
  <circle cx={at.x} cy={at.y} r={0.75} className="stroke-md opacity-50  text-warning" />
)

// Close to the core Path.divide() function, but working with display paths instead of Path objects
const dividePath = function (path) {
  let result = []
  let current
  for (let i in path.ops) {
    let op = path.ops[i]
    if (op.type === 'move') {
      result.push({ op: op, p: current ? { ops: [{ type: 'move', to: current }, op] } : null })
    } else if (op.type === 'line') {
      result.push({ op: op, p: { ops: [{ type: 'move', to: current }, op] } })
    } else if (op.type === 'curve') {
      result.push({ op: op, p: { ops: [{ type: 'move', to: current }, op] } })
    } else if (op.type === 'close') {
      result.push({ op: op, p: { ops: [{ type: 'move', to: current }, op] } })
    } else {
      result.push({ op: op, p: null })
    }
    if (op.to) current = op.to
  }

  return result
}

export const PathXray = ({
  stackName,
  pathName,
  part,
  path,
  settings,
  components,
  strings,
  drillProps = {},
}) => {
  if (path.hidden) {
    return null
  }

  /*
   * We use the Path component from Pattern here
   * If we would extract Path from the components passed down,
   * we'd create a recursion loop as the Path we call below
   * would be this very PathXray component.
   */
  const { Path } = patternComponents
  const { info = {} } = drillProps

  const output = []
  let prev
  let i = 0
  for (const op of path.ops) {
    if (op.type === 'curve') {
      output.push(
        <Cp at={op.cp1} key={`${i}-cp1`} />,
        <Cp at={op.cp2} key={`${i}-cp2`} />,
        <path
          key={i}
          d={`M ${coords(prev.to)} L ${coords(op.cp1)} M ${coords(op.to)} L ${coords(op.cp2)}`}
          className={`text-warning stroke-sm dashed opacity-50`}
          style={{
            stroke: 'var(--pattern-lining)',
            strokeWidth: '0.666',
          }}
          strokeDasharray="10 5"
          markerStart="none"
          markerEnd="none"
        />
      )
    }
    prev = op
    i++
  }
  output.push(
    <path key="path" d={path.d} {...getProps(path)} markerStart="none" markerEnd="none" />,
    <path
      key="hovertrap"
      d={path.d}
      style={{
        stroke: 'var(--pattern-lining)',
        strokeWidth: '5',
      }}
      strokeWidth="12"
      strokeDasharray="20 10"
      className="tw:hover:cursor-pointer tw:opacity-0 tw:hover:opacity-30"
      onClick={() =>
        info?.set ? info.set(<PathXrayInfo {...{ path, pathName, part, stackName }} />) : null
      }
    >
      <animate
        attributeName="stroke-dashoffset"
        from="30"
        to="0"
        dur="2s"
        repeatCount="indefinite"
      />
    </path>
  )

  return (
    <g>
      {output}
      <Path {...{ stackName, pathName, path, part, settings, components, strings, drillProps }} />
    </g>
  )
}

const PathXrayInfo = ({ path, pathName, stackName }) => {
  const [rounded, setRounded] = useState(true)
  const rounder = rounded ? round : (val) => val

  return (
    <div className="tw:max-w-2xl">
      <H5>
        Path <code>{pathName}</code> of <code>{stackName}</code>
      </H5>
      {Object.keys(path.attributes.list).length > 0 ? (
        <>
          <H6>Attributes</H6>
          <div className="tw:flex tw:flex-row tw:flex-wrap tw:gap-1 tw:items-center">
            {Object.entries(path.attributes.list).map(([k, val]) => (
              <KeyVal color="secondary" key={k} k={k} val={val} />
            ))}
            <KeyVal
              color={path.hidden ? 'error' : 'success'}
              k="hidden"
              val={path.hidden ? 'yes' : 'no'}
            />
          </div>
        </>
      ) : null}
      <H6>Dimensions</H6>
      <table className="tw:table tw:table-auto tw:font-fixed tw:w-full">
        <thead>
          <tr>
            <th>Type</th>
            <th className="tw:flex tw:flex-row tw:flex-wrap tw:items-center tw:justify-between">
              <span>Coordinates</span>
              <button
                className="tw:daisy-btn tw:daisy-btn-primary tw:daisy-btn-sm tw:daisy-btn-outline"
                onClick={() => setRounded(!rounded)}
              >
                {rounded ? 'Show raw' : 'Show rounded'}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="tw:text-right tw:font-bold tw:w-16">TopLeft</td>
            <td className="tw:flex tw:flex-row tw:flex-wrap tw:gap-1 tw:items-center">
              <KeyVal k="x" val={rounder(path.topLeft.x)} />
              <KeyVal k="y" val={rounder(path.topLeft.y)} />
            </td>
          </tr>
          <tr>
            <td className="tw:text-right tw:font-bold tw:w-16">BottomRight</td>
            <td className="tw:flex tw:flex-row tw:flex-wrap tw:gap-1 tw:items-center">
              <KeyVal k="x" val={rounder(path.bottomRight.x)} />
              <KeyVal k="y" val={rounder(path.bottomRight.y)} />
            </td>
          </tr>
          <tr>
            <td className="tw:text-right tw:font-bold tw:w-16">Width</td>
            <td>
              <KeyVal k="mm" val={rounder(path.width)} />
            </td>
          </tr>
          <tr>
            <td className="tw:text-right tw:font-bold tw:w-16">Height</td>
            <td>
              <KeyVal k="mm" val={rounder(path.height)} />
            </td>
          </tr>
          <tr>
            <td className="tw:text-right tw:font-bold tw:w-16">Path Length</td>
            <td>
              <KeyVal k="mm" val={rounder(pathLength(path))} />
            </td>
          </tr>
        </tbody>
      </table>
      <H6>Drawing operations</H6>
      <table className="tw:table tw:table-auto tw:font-fixed tw:w-full">
        <thead>
          <tr>
            <th>Type</th>
            <th className="tw:flex tw:flex-row tw:flex-wrap tw:items-center tw:justify-between">
              <span>Coordinates</span>
              <button
                className="tw:daisy-btn tw:daisy-btn-primary tw:daisy-btn-sm tw:daisy-btn-outline"
                onClick={() => setRounded(!rounded)}
              >
                {rounded ? 'Show raw' : 'Show rounded'}
              </button>
            </th>
            <th>Length</th>
          </tr>
        </thead>
        <tbody>
          {dividePath(path).map((division, i) => {
            const op = division.op
            const subPath = division.p
            return (
              <tr key={i}>
                <td className="tw:text-right tw:font-bold tw:w-16">{op.type}</td>
                {['move', 'line'].includes(op.type) ? (
                  <td className="tw:flex tw:flex-row tw:flex-wrap tw:gap-1 tw:items-center">
                    <b className="tw:text-xs tw:opacity-80 tw:block tw:w-8">To:</b>
                    <KeyVal k="x" val={rounder(op.to.x)} />
                    <KeyVal k="y" val={rounder(op.to.y)} />
                  </td>
                ) : null}
                {op.type === 'close' ? <td></td> : null}
                {op.type === 'curve' ? (
                  <td className="tw:flex tw:flex-col">
                    <div className="tw:flex tw:flex-row tw:flex-wrap tw:gap-1 tw:items-center">
                      <b className="tw:text-xs tw:opacity-80 tw:block tw:w-8">Cp1:</b>
                      <KeyVal k="x" val={rounder(op.cp1.x)} />
                      <KeyVal k="y" val={rounder(op.cp1.y)} />
                    </div>
                    <div className="tw:flex tw:flex-row tw:flex-wrap tw:gap-1 tw:items-center">
                      <b className="tw:text-xs tw:opacity-80 tw:block tw:w-8">Cp2:</b>
                      <KeyVal k="x" val={rounder(op.cp2.x)} />
                      <KeyVal k="y" val={rounder(op.cp2.y)} />
                    </div>
                    <div className="tw:flex tw:flex-row tw:flex-wrap tw:gap-1 tw:items-center">
                      <b className="tw:text-xs tw:opacity-80 tw:block tw:w-8">To:</b>
                      <KeyVal k="x" val={rounder(op.to.x)} />
                      <KeyVal k="y" val={rounder(op.to.y)} />
                    </div>
                  </td>
                ) : null}
                {op.type === 'noop' ? <td>{op.id}</td> : null}
                <td>{subPath ? <KeyVal k="mm" val={rounder(pathLength(subPath))} /> : '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <H6>Pathstring</H6>
      <Highlight language="SVG">{path.d}</Highlight>
    </div>
  )
}
