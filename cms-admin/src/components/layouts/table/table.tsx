import { ColumnModel, UserData } from '@/components/layouts/table/types'
import { sortDateFn, sortNumberFn, sortTextFn } from '@/components/layouts/table/utils'
import FilterDropdown from '@/components/ui/filterDropdown'
import MultiFilter from '@/components/ui/multiFilter'
import SearchDropdown from '@/components/ui/searchDropdown'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import React, { useState } from 'react'
import './index.scss'


interface TableProps {
  data: UserData[]
  columns: ColumnModel[]
  isRowSelection?: boolean
  hiddenable?: boolean
  lockedable?: boolean
  resizable?: boolean
  isShowNumberPerPage?: boolean
}
/**
 * TableComponent: Component bảng dữ liệu
 * @data: dữ liệu
 * @columns: các cột
 * @isRowSelection: có chọn hàng hay không
 * @hiddenable: có ẩn hiện cột hay không
 * @lockedable: có lock cột hay không
 * @resizable: có thể thay đổi kích thước cột hay không
 * @isShowNumberPerPage: có hiển thị số lượng hàng mỗi trang hay không
 */
const TableComponent: React.FC<TableProps> = ({
  data,
  columns,
  isRowSelection,
  hiddenable,
  lockedable,
  resizable,
  isShowNumberPerPage
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState({}) // ẩn hiện cột
  const [rowSelection, setRowSelection] = React.useState({}) // check hàng
  const [lockedColumn, setLockedColumn] = useState<number>(-1)

  const handleLockChange = (columnIndex: number) => {
    if (lockedColumn !== null && columnIndex === lockedColumn) {
      // Nếu click vào cột cuối đang bị lock, unlock cột đó nhưng giữ các cột trước
      setLockedColumn(columnIndex - 1)
    } else if (columnIndex > lockedColumn) {
      // Nếu click vào cột cao hơn lockedColumn hiện tại, lock tất cả từ đầu đến cột đó
      setLockedColumn(columnIndex)
    } else if (columnIndex < lockedColumn) {
      // Nếu click vào cột thấp hơn hoặc bằng lockedColumn hiện tại, lock từ đầu đến cột đó
      setLockedColumn(columnIndex)
    }
  }

  const flatData = React.useMemo<ColumnDef<UserData, any>[]>(() => {
    // Check if row selection is enabled
    const selectionColumn = isRowSelection
      ? {
          id: 'select',
          header: ({ table }) => (
            <input
              type='checkbox'
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          ),
          cell: ({ row }) => (
            <input type='checkbox' checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
          ),
          size: 50
        }
      : null

    const dataColumns = columns.map((columnModel: ColumnModel) => {
      const { key, label, sortable, render, searchable, filterOtions } = columnModel
      const sortType = columnModel.sortType || 'text'
      let sortingFn

      if (sortType === 'text') {
        sortingFn = sortTextFn
      } else if (sortType === 'number') {
        sortingFn = sortNumberFn
      } else if (sortType === 'date') {
        sortingFn = sortDateFn
      }

      return {
        accessorKey: key,
        header: () => (
          <div className='flex gap-2 flex-shrink-0 w-full h-full justify-between items-center'>
            <span className='flex-shrink-0'>{label}</span>
            {sortable && !searchable && !filterOtions && (
              <FilterDropdown
                sortType={sortType}
                isSort
                onChange={(value) => {
                  if (value === null) {
                    table.resetSorting(true)
                  } else {
                    setSorting([{ id: key, desc: value === 'desc' }])
                  }
                }}
              />
            )}
            {sortable && (searchable || filterOtions) && (
              <MultiFilter
                onSortChange={(value) => {
                  if (value === null) {
                    table.resetSorting(true)
                  } else {
                    setSorting([{ id: key, desc: value === 'desc' }])
                  }
                }}
                onFilterChange={(value) => {
                  if (value === null) {
                    setColumnFilters([])
                  } else {
                    setColumnFilters([{ id: key, value }])
                  }
                }}
                onSearchChange={(value) =>
                  setColumnFilters((prevFilters) => [...prevFilters.filter((f) => f.id !== key), { id: key, value }])
                }
                filterOptions={filterOtions?.map((value) => ({ label: value, value }))}
                isSort={sortable}
                sortType={sortType}
                isSearch={searchable}
              />
            )}
            {filterOtions && !searchable && !sortable && (
              <FilterDropdown
                optionFilter={filterOtions.map((value) => ({ label: value, value }))}
                onChange={(value) => {
                  if (value === null) {
                    setColumnFilters([])
                  } else {
                    setColumnFilters([{ id: key, value }])
                  }
                }}
              />
            )}
            {searchable && !sortable && !filterOtions && (
              <SearchDropdown
                onChange={(value) =>
                  setColumnFilters((prevFilters) => [...prevFilters.filter((f) => f.id !== key), { id: key, value }])
                }
              />
            )}
          </div>
        ),
        cell: render ? (info) => render(info.row.original) : (info) => info.getValue(),
        sortingFn: sortable ? sortingFn : undefined
      }
    })

    // Conditionally include the selection column
    return selectionColumn ? [selectionColumn, ...dataColumns] : dataColumns
  }, [columns, isRowSelection])

  const calculateLeftOffset = (columnIndex: number) => {
    let leftOffset = 0

    // Lấy các cột trước cột hiện tại và cộng dồn độ rộng của từng cột
    for (let i = 0; i < columnIndex; i++) {
      const column = table.getAllLeafColumns()[i]
      const a = column.getSize()
      console.log(a)
      leftOffset += column.getSize() // Cộng tổng kích thước thực của các cột trước đó
    }

    return `${leftOffset}px` // Trả về chuỗi có đơn vị px
  }

  const table = useReactTable({
    data,
    columns: flatData,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection // chọn hàng
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: resizable ? 'onChange' : undefined,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    debugTable: true,
    debugHeaders: true,
    debugColumns: false,
    defaultColumn: {
      size: 200, //starting column size
      minSize: 50, //enforced during column resizing
      maxSize: 500, //enforced during column resizing
      enableResizing: resizable
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility, // Ẩn hiện cột,
    enableRowSelection: true, // chọn tất cả
    onRowSelectionChange: setRowSelection
  })

  return (
    <div className='p-2'>
      <div className='inline-block border border-black shadow rounded'>
        {/* Checkboxes to lock/unlock columns */}
        {lockedable && (
          <div className='px-1 border-b border-black'>
            {table.getAllLeafColumns().map((column, columnIndex) => (
              <div key={column.id} className='px-1'>
                <label>
                  <input
                    type='checkbox'
                    checked={lockedColumn !== null && columnIndex <= lockedColumn}
                    onChange={() => handleLockChange(columnIndex)}
                  />
                  {column.id}
                </label>
              </div>
            ))}
          </div>
        )}
        {hiddenable && (
          <>
            <div className='px-1 border-b border-black'>
              <label>
                <input
                  {...{
                    type: 'checkbox',
                    checked: table.getIsAllColumnsVisible(),
                    onChange: table.getToggleAllColumnsVisibilityHandler()
                  }}
                />{' '}
                Toggle All
              </label>
            </div>
            {table.getAllLeafColumns().map((column) => {
              return (
                <div key={column.id} className='px-1'>
                  <label>
                    <input
                      {...{
                        type: 'checkbox',
                        checked: column.getIsVisible(),
                        onChange: column.getToggleVisibilityHandler()
                      }}
                    />{' '}
                    {column.id}
                  </label>
                </div>
              )
            })}
          </>
        )}
      </div>
      <div className='flex max-w-[1200px]'>
        {/* Div for locked columns */}
        <div className='locked-columns min-w-fit' style={{ overflow: 'hidden', position: 'relative' }}>
          <table>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(
                    (header, columnIndex) =>
                      lockedColumn !== null &&
                      columnIndex <= lockedColumn && (
                        <th
                          key={header.id}
                          className='flex'
                          style={{
                            width: header.getSize(),
                            position: 'sticky',
                            left: calculateLeftOffset(columnIndex), // Calculate the left offset dynamically
                            zIndex: 10
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          <div
                            {...{
                              onDoubleClick: () => header.column.resetSize(),
                              onMouseDown: resizable ? header.getResizeHandler() : undefined, // Chỉ kích hoạt nếu resizable = true
                              onTouchStart: resizable ? header.getResizeHandler() : undefined, // Chỉ kích hoạt nếu resizable = true
                              className: resizable
                                ? `resizer ${table.options.columnResizeDirection} ${header.column.getIsResizing() ? 'isResizing' : ''}`
                                : ''
                            }}
                          />
                        </th>
                      )
                  )}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(
                    (cell, columnIndex) =>
                      lockedColumn !== null &&
                      columnIndex <= lockedColumn && (
                        <td
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            position: 'sticky',
                            left: calculateLeftOffset(columnIndex),
                            zIndex: 10
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Div for scrollable columns */}
        <div className='scroll-container overflow-x-auto '>
          <table>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, columnIndex) =>
                    lockedColumn === null || columnIndex > lockedColumn ? (
                      <th
                        key={header.id}
                        className='flex'
                        style={{
                          width: header.getSize()
                        }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        <div
                          {...{
                            onDoubleClick: () => header.column.resetSize(),
                            onMouseDown: resizable ? header.getResizeHandler() : undefined, // Chỉ kích hoạt nếu resizable = true
                            onTouchStart: resizable ? header.getResizeHandler() : undefined, // Chỉ kích hoạt nếu resizable = true
                            className: resizable
                              ? `resizer ${table.options.columnResizeDirection} ${header.column.getIsResizing() ? 'isResizing' : ''}`
                              : ''
                          }}
                        />
                      </th>
                    ) : null
                  )}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell, columnIndex) =>
                    lockedColumn === null || columnIndex > lockedColumn ? (
                      <td
                        key={cell.id}
                        style={{
                          width: cell.column.getSize()
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ) : null
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phân trang */}
      <div className='flex items-center gap-2'>
        <button
          className='border rounded p-1'
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          {'<<'}
        </button>
        <button
          className='border rounded p-1'
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {'<'}
        </button>
        <button className='border rounded p-1' onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          {'>'}
        </button>
        <button
          className='border rounded p-1'
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </button>
        <span className='flex items-center gap-1'>
          <div>Page</div>
          <strong>
            {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </strong>
        </span>
        <span className='flex items-center gap-1'>
          | Go to page:
          <input
            type='number'
            min='1'
            max={table.getPageCount()}
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              table.setPageIndex(page)
            }}
            className='border p-1 rounded w-16'
          />
        </span>
        {isShowNumberPerPage && (
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value))
            }}
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        {Object.keys(rowSelection).length} of {table.getPreFilteredRowModel().rows.length} Total Rows Selected
      </div>
      <pre>
        {JSON.stringify(
          {
            columnSizing: table.getState().columnSizing,
            columnSizingInfo: table.getState().columnSizingInfo
          },
          null,
          2
        )}
      </pre>
      {/* <div>
        <button
          className='border rounded p-2 mb-2'
          onClick={() => console.info('table.getSelectedRowModel().flatRows', table.getSelectedRowModel().flatRows)}
        >
          Log table.getSelectedRowModel().flatRows
        </button>
      </div> */}
      <div>
        <label>Row Selection State:</label>
        <pre>{JSON.stringify(table.getState().rowSelection, null, 2)}</pre>
      </div>
    </div>
  )
}

export default TableComponent
