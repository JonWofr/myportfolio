Todos left: 

- Image-Upload should not be done with one single JSON request and with the image being Base64-encoded. It should be done doing to requests. First one should only store the image and return the path. The second one should create the resource and store the path on one of the propertie's values.
- Header and Filters-Sidebar should be two different components for mobile and desktop Layout. Depending on the user device either one or the other component should be rendered. Therefore complex CSS media queries can be omitted.