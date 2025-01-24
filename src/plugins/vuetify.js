import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import * as colors from 'vuetify/lib/util/colors'

export default createVuetify({
    components,
    directives,
    theme: {
        themes: {
            light: {
                colors: {
                    primary: colors.brown.darken2,
                    secondary: colors.grey.darken3,
                    accent: colors.brown.base,
                    background: '#f5f5f5',
                    surface: '#ffffff',
                },
            },
        },
    },
})