/**
 * Pagination metadata containing information about the paginated result
 */
export interface PaginationMeta {
  /**
   * Total number of items across all pages
   */
  totalItems: number;

  /**
   * Number of items in the current page
   */
  itemCount: number;

  /**
   * Number of items per page
   */
  itemsPerPage: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Current page number (1-based)
   */
  currentPage: number;
}

/**
 * Pagination links for navigation
 */
export interface PaginationLinks {
  /**
   * Link to the first page
   */
  first: string;

  /**
   * Link to the previous page (empty string if on first page)
   */
  previous: string;

  /**
   * Link to the next page (empty string if on last page)
   */
  next: string;

  /**
   * Link to the last page
   */
  last: string;
}

/**
 * Paginated response structure
 */
export interface Pagination<T> {
  /**
   * Array of items for the current page
   */
  items: T[];

  /**
   * Pagination metadata
   */
  meta: PaginationMeta;

  /**
   * Pagination navigation links
   */
  links: PaginationLinks;
}
