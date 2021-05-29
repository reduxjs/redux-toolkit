import { Center, VStack, Box, Button } from '@chakra-ui/react'
import { useProtectedMutation } from '../../app/services/auth'

export function ProtectedComponent() {
  const [attemptAccess, { data, error, isLoading }] = useProtectedMutation()

  return (
    <Center w="400px">
      <VStack>
        <Box>
          <Button onClick={() => attemptAccess()} isLoading={isLoading}>
            Make an authenticated request
          </Button>
        </Box>
        <Box>
          {data ? (
            <>
              Data:
              <pre>{JSON.stringify(data, null, 2)}</pre>
            </>
          ) : error ? (
            <>
              Error: <pre>{JSON.stringify(error, null, 2)}</pre>
            </>
          ) : null}
        </Box>
      </VStack>
    </Center>
  )
}
